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
      .select("id, start_date, end_date, status")
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from("mentors").select("id, name").eq("status", "active").order("name"),
    supabaseAdmin.from("binaan").select("id, name, mentor_id").eq("status", "active").order("name"),
    supabaseAdmin
      .from("mutabaah_indicators")
      .select("id, code, name, target, unit, order_number")
      .eq("active", true)
      .order("order_number"),
  ]);

  return {
    period: periodRes.data ?? { id: "p1000000-0000-0000-0000-000000000004", start_date: "2026-08-10", end_date: "2026-08-16" },
    mentors: (mentorRes.data ?? []) as { id: string; name: string }[],
    binaan: (binaanRes.data ?? []) as { id: string; name: string; mentor_id: string }[],
    indicators: (indicatorRes.data ?? []) as PublicIndicator[],
  };
}

import { UZUR_VALUE } from "./mutabaah-config";

export type SubmitPayload = {
  binaanId: string;
  mentorId: string;
  entries: { indicatorId: string; realization: number; isUzur?: boolean }[];
  attendanceStatus?: "hadir" | "tidak_hadir";
  mentoringDate?: string;
  attendanceNote?: string;
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
    return { ok: false, error: "Mentor tidak ditemukan atau tidak aktif." };
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

  if (!period) {
    return { ok: false, error: "Belum ada periode mutabaah yang aktif. Hubungi Admin." };
  }

  const { data: indicatorRows } = await supabaseAdmin
    .from("mutabaah_indicators")
    .select("id, target")
    .eq("active", true)
    .order("order_number");

  const indicators = (indicatorRows ?? []) as { id: string; target: number }[];
  if (indicators.length === 0) {
    return { ok: false, error: "Indikator mutabaah belum tersedia. Hubungi Admin." };
  }

  for (const indicator of indicators) {
    const entry = payload.entries.find((e) => e.indicatorId === indicator.id);
    if (!entry || entry.realization === null || entry.realization === undefined) {
      return { ok: false, error: "Semua indikator mutabaah wajib diisi." };
    }
  }

  const byId = new Map(indicators.map((i) => [i.id, Number(i.target)]));
  const scored = payload.entries
    .filter((e) => byId.has(e.indicatorId))
    .map((e) => {
      const target = byId.get(e.indicatorId)!;
      const isUzur = Boolean(e.isUzur || e.realization === UZUR_VALUE);
      const realization = isUzur ? 0 : Math.max(0, Number(e.realization));
      const achievement = isUzur ? 0 : scoreFor(realization, target);
      return {
        indicator_id: e.indicatorId,
        target,
        realization,
        achievement_percentage: achievement,
        is_uzur: isUzur,
      };
    });

  // Rules: UZUR is EXCLUDED from average score calculation
  const assessed = scored.filter((s) => !s.is_uzur);
  const totalScore =
    assessed.length > 0
      ? Math.round((assessed.reduce((sum, s) => sum + s.achievement_percentage, 0) / assessed.length) * 100) / 100
      : 0;

  const attendanceStatus = payload.attendanceStatus === "tidak_hadir" ? "tidak_hadir" : "hadir";
  const mentoringDate = payload.mentoringDate || new Date().toISOString().split("T")[0];
  const attendanceNote = payload.attendanceNote?.trim() || null;

  let submissionRes = await supabaseAdmin
    .from("mutabaah_submissions")
    .upsert(
      {
        binaan_id: binaan.id,
        mentor_id: mentor.id,
        period_id: period.id,
        total_score: totalScore,
        status: "submitted",
        attendance_status: attendanceStatus,
        mentoring_date: mentoringDate,
        attendance_note: attendanceNote,
      } as any,
      { onConflict: "binaan_id,period_id" },
    )
    .select("id")
    .single();

  if (submissionRes.error && submissionRes.error.code === "42703") {
    submissionRes = await supabaseAdmin
      .from("mutabaah_submissions")
      .upsert(
        {
          binaan_id: binaan.id,
          mentor_id: mentor.id,
          period_id: period.id,
          total_score: totalScore,
          status: "submitted",
        },
        { onConflict: "binaan_id,period_id" },
      )
      .select("id")
      .single();
  }

  const { data: submission, error: submissionError } = submissionRes;

  if (submissionError || !submission?.id) {
    console.error("submitMutabaahRecord error:", submissionError);
    return { ok: false, error: "Gagal menyimpan data mutabaah. Silakan coba lagi." };
  }

  await supabaseAdmin.from("mutabaah_entries").delete().eq("submission_id", submission.id);

  let entriesRes = await supabaseAdmin
    .from("mutabaah_entries")
    .insert(scored.map((s) => ({ ...s, submission_id: submission.id })));

  if (entriesRes.error && entriesRes.error.code === "42703") {
    entriesRes = await supabaseAdmin
      .from("mutabaah_entries")
      .insert(
        scored.map((s) => ({
          submission_id: submission.id,
          indicator_id: s.indicator_id,
          target: s.target,
          realization: s.realization,
          achievement_percentage: s.achievement_percentage,
        })),
      );
  }

  if (entriesRes.error) {
    console.error("submitMutabaahRecord entries error:", entriesRes.error);
    return { ok: false, error: "Gagal menyimpan rincian indikator. Silakan coba lagi." };
  }

  return {
    ok: true,
    binaanName: binaan.name,
    mentorName: mentor.name,
    period: `${period.start_date}|${period.end_date}`,
    score: totalScore,
  };
}
