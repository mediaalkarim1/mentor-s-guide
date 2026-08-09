import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scoreFor } from "./mutabaah-config";

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
  const [periodRes, mentorRes, binaanRes, indicatorRes] = await Promise.all([
    supabaseAdmin
      .from("mutabaah_periods")
      .select("id, start_date, end_date")
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

  return {
    period: periodRes.data ?? null,
    mentors: mentorRes.data ?? [],
    binaan: binaanRes.data ?? [],
    indicators: (indicatorRes.data ?? []) as PublicIndicator[],
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
  const { data: binaan } = await supabaseAdmin
    .from("binaan")
    .select("id, name, mentor_id, status")
    .eq("id", payload.binaanId)
    .maybeSingle();

  if (!binaan || binaan.status !== "active") {
    return { ok: false, error: "Nama Binaan tidak terdaftar. Silakan pilih dari daftar." };
  }

  const { data: mentor } = await supabaseAdmin
    .from("mentors")
    .select("id, name, status")
    .eq("id", payload.mentorId)
    .maybeSingle();

  if (!mentor || mentor.status !== "active") {
    return { ok: false, error: "Mentor tidak ditemukan." };
  }

  if (binaan.mentor_id !== mentor.id) {
    return {
      ok: false,
      error: "Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.",
    };
  }

  const { data: period } = await supabaseAdmin
    .from("mutabaah_periods")
    .select("id, start_date, end_date")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!period) return { ok: false, error: "Belum ada periode aktif. Hubungi Admin." };

  const { data: indicators } = await supabaseAdmin
    .from("mutabaah_indicators")
    .select("id, target")
    .eq("active", true);

  const indicatorList = indicators ?? [];
  const byId = new Map(indicatorList.map((i) => [i.id, Number(i.target)]));

  for (const indicator of indicatorList) {
    const entry = payload.entries.find((e) => e.indicatorId === indicator.id);
    if (!entry || entry.realization === null || entry.realization === undefined) {
      return { ok: false, error: "Semua indikator mutabaah wajib diisi." };
    }
  }

  const { data: existing } = await supabaseAdmin
    .from("mutabaah_submissions")
    .select("id")
    .eq("binaan_id", binaan.id)
    .eq("period_id", period.id)
    .maybeSingle();

  if (existing) return { ok: false, error: "Mutabaah pekan ini sudah diisi." };

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

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from("mutabaah_submissions")
    .insert({
      binaan_id: binaan.id,
      mentor_id: mentor.id,
      period_id: period.id,
      total_score: totalScore,
      status: "submitted",
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    if (submissionError?.code === "23505") {
      return { ok: false, error: "Mutabaah pekan ini sudah diisi." };
    }
    return { ok: false, error: "Gagal menyimpan mutabaah. Silakan coba lagi." };
  }

  const { error: entriesError } = await supabaseAdmin
    .from("mutabaah_entries")
    .insert(scored.map((s) => ({ ...s, submission_id: submission.id })));

  if (entriesError) {
    await supabaseAdmin.from("mutabaah_submissions").delete().eq("id", submission.id);
    return { ok: false, error: "Gagal menyimpan rincian mutabaah. Silakan coba lagi." };
  }

  return {
    ok: true,
    binaanName: binaan.name,
    mentorName: mentor.name,
    period: `${period.start_date}|${period.end_date}`,
    score: totalScore,
  };
}