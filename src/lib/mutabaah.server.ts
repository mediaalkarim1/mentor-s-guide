import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scoreFor } from "./mutabaah-config";
import { getMasterStore, updateMasterStore } from "./master_overrides.server";
import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIOD,
  type MasterIndicator,
} from "./master-data";

export type PublicIndicator = {
  id: string;
  code: string;
  name: string;
  target: number;
  unit: string;
  order_number: number;
};

export type PublicFormData = {
  period: { id: string; start_date: string; end_date: string } | null;
  mentors: { id: string; name: string }[];
  binaan: { id: string; name: string; mentor_id: string }[];
  indicators: PublicIndicator[];
};

export async function loadPublicFormData(): Promise<PublicFormData> {
  const store = getMasterStore();

  let periodRes: any, mentorRes: any, binaanRes: any, indicatorRes: any;
  try {
    [periodRes, mentorRes, binaanRes, indicatorRes] = await Promise.all([
      supabaseAdmin
        .from("mutabaah_periods")
        .select("id, start_date, end_date, status")
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.from("mentors").select("id, name").eq("status", "active").order("name"),
      supabaseAdmin
        .from("binaan")
        .select("id, name, mentor_id")
        .eq("status", "active")
        .order("name"),
      supabaseAdmin
        .from("mutabaah_indicators")
        .select("id, code, name, target, unit, order_number")
        .eq("active", true)
        .order("order_number"),
    ]);
  } catch (e) {
    console.warn("loadPublicFormData DB fetch exception, using master fallback data", e);
  }

  const activePeriodFromStore = store.periods.find((p) => p.status === "active");
  const period = activePeriodFromStore ?? periodRes?.data ?? MASTER_PERIOD;

  const mentorMap = new Map<string, any>();
  store.mentors.forEach((m) => mentorMap.set((m.name || "").toLowerCase().trim(), m));
  (mentorRes?.data ?? []).forEach((m: any) => mentorMap.set((m.name || "").toLowerCase().trim(), m));
  const mentors = Array.from(mentorMap.values()).length > 0 ? Array.from(mentorMap.values()) : MASTER_MENTORS;

  const binaanMap = new Map<string, any>();
  store.binaan.forEach((b) => binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b));
  (binaanRes?.data ?? []).forEach((b: any) => binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b));
  const binaan = Array.from(binaanMap.values()).length > 0 ? Array.from(binaanMap.values()) : MASTER_BINAAN;

  const indicatorMap = new Map<string, any>();
  store.indicators.forEach((i) => indicatorMap.set((i.code || "").toUpperCase().trim(), i));
  (indicatorRes?.data ?? []).forEach((i: any) => indicatorMap.set((i.code || "").toUpperCase().trim(), i));
  const indicators = Array.from(indicatorMap.values()).length > 0 ? Array.from(indicatorMap.values()) : MASTER_INDICATORS;

  return {
    period,
    mentors,
    binaan,
    indicators: indicators as PublicIndicator[],
  };
}

export type SubmitPayload = {
  binaanId: string;
  mentorId: string;
  entries: { indicatorId: string; realization: number }[];
};

export type SubmitResult =
  | { ok: true; binaanName: string; mentorName: string; period: string; score: number }
  | { ok: false; error: string };

export async function submitMutabaahRecord(payload: SubmitPayload): Promise<SubmitResult> {
  const store = getMasterStore();

  let binaan = (await supabaseAdmin
    .from("binaan")
    .select("id, name, mentor_id, status")
    .eq("id", payload.binaanId)
    .maybeSingle()).data;

  if (!binaan) {
    const storeB = store.binaan.find((b) => b.id === payload.binaanId || b.name.toLowerCase() === payload.binaanId.toLowerCase());
    if (storeB) {
      binaan = { id: storeB.id, name: storeB.name, mentor_id: storeB.mentor_id, status: "active" };
    } else {
      const masterB = MASTER_BINAAN.find((b) => b.id === payload.binaanId || b.name.toLowerCase() === payload.binaanId.toLowerCase());
      if (masterB) {
        binaan = { id: masterB.id, name: masterB.name, mentor_id: masterB.mentor_id, status: "active" };
      }
    }
  }

  if (!binaan) {
    return { ok: false, error: "Nama Binaan tidak terdaftar. Silakan pilih dari daftar." };
  }

  let mentor = (await supabaseAdmin
    .from("mentors")
    .select("id, name, status")
    .eq("id", payload.mentorId)
    .maybeSingle()).data;

  if (!mentor) {
    const storeM = store.mentors.find((m) => m.id === payload.mentorId || m.name.toLowerCase() === payload.mentorId.toLowerCase());
    if (storeM) {
      mentor = { id: storeM.id, name: storeM.name, status: "active" };
    } else {
      const masterM = MASTER_MENTORS.find((m) => m.id === payload.mentorId || m.name.toLowerCase() === payload.mentorId.toLowerCase());
      if (masterM) {
        mentor = { id: masterM.id, name: masterM.name, status: "active" };
      }
    }
  }

  if (!mentor) {
    return { ok: false, error: "Mentor tidak ditemukan." };
  }

  if (binaan.mentor_id !== mentor.id) {
    return {
      ok: false,
      error: "Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.",
    };
  }

  let period = (await supabaseAdmin
    .from("mutabaah_periods")
    .select("id, start_date, end_date, status")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle()).data;

  if (!period) {
    const activeStorePeriod = store.periods.find((p) => p.status === "active");
    period = activeStorePeriod ?? MASTER_PERIOD;
  }

  const indicatorList = MASTER_INDICATORS;
  const byId = new Map(indicatorList.map((i) => [i.id, Number(i.target)]));

  for (const indicator of indicatorList) {
    const entry = payload.entries.find((e) => e.indicatorId === indicator.id);
    if (!entry || entry.realization === null || entry.realization === undefined) {
      return { ok: false, error: "Semua indikator mutabaah wajib diisi." };
    }
  }

  const scored = payload.entries
    .filter((e) => byId.has(e.indicatorId))
    .map((e) => {
      const target = byId.get(e.indicatorId)!;
      const realization = Math.max(0, Number(e.realization));
      return {
        indicator_id: e.indicatorId,
        target,
        realization,
        achievement_percentage: scoreFor(realization, target),
      };
    });

  const totalScore =
    Math.round(
      (scored.reduce((sum, s) => sum + s.achievement_percentage, 0) / scored.length) * 100,
    ) / 100;

  // Double-lock persistence: save submission to server master store
  updateMasterStore("submissions", "upsert", {
    binaan_id: binaan.id,
    binaanName: binaan.name,
    mentor_id: mentor.id,
    mentorName: mentor.name,
    period_id: period.id,
    total_score: totalScore,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    mutabaah_entries: scored,
  });

  // Ensure mentor, binaan, and period records exist in DB before inserting mutabaah_submissions
  try {
    await supabaseAdmin.from("mentors").upsert({ id: mentor.id, name: mentor.name, status: "active" }, { onConflict: "id" });
  } catch (_) {}

  try {
    await supabaseAdmin.from("binaan").upsert({ id: binaan.id, name: binaan.name, mentor_id: mentor.id, status: "active" }, { onConflict: "id" });
  } catch (_) {}

  try {
    await supabaseAdmin.from("mutabaah_periods").upsert({ id: period.id, start_date: period.start_date, end_date: period.end_date, status: period.status ?? "active" }, { onConflict: "id" });
  } catch (_) {}

  // DB insertion
  try {
    const { data: submission } = await supabaseAdmin
      .from("mutabaah_submissions")
      .upsert({
        binaan_id: binaan.id,
        mentor_id: mentor.id,
        period_id: period.id,
        total_score: totalScore,
        status: "submitted",
      }, { onConflict: "binaan_id,period_id" })
      .select("id")
      .single();

    if (submission?.id) {
      await supabaseAdmin
        .from("mutabaah_entries")
        .delete()
        .eq("submission_id", submission.id);

      await supabaseAdmin
        .from("mutabaah_entries")
        .insert(scored.map((s) => ({ ...s, submission_id: submission.id })));
    }
  } catch (e) {
    console.warn("DB submission insert warning, proceeding with score response", e);
  }

  return {
    ok: true,
    binaanName: binaan.name,
    mentorName: mentor.name,
    period: `${period.start_date}|${period.end_date}`,
    score: totalScore,
  };
}