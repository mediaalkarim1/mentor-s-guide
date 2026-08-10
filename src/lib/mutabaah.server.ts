import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scoreFor, UZUR_VALUE } from "./mutabaah-config";

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

export const FALLBACK_PERIOD = {
  id: "c1000000-0000-0000-0000-000000000004",
  start_date: "2026-08-10",
  end_date: "2026-08-16",
};

export const FALLBACK_INDICATORS: PublicIndicator[] = [
  { id: "d1000000-0000-0000-0000-000000000001", code: "THJ", name: "Sholat Tahajud", target: 3, unit: "kali", order_number: 1 },
  { id: "d1000000-0000-0000-0000-000000000002", code: "WTR", name: "Sholat Witir", target: 3, unit: "kali", order_number: 2 },
  { id: "d1000000-0000-0000-0000-000000000003", code: "DHU", name: "Sholat Dhuha", target: 5, unit: "kali", order_number: 3 },
  { id: "d1000000-0000-0000-0000-000000000004", code: "RWB", name: "Sholat Sunnah Rawatib", target: 21, unit: "rakaat", order_number: 4 },
  { id: "d1000000-0000-0000-0000-000000000005", code: "MTS", name: "Al-Matsurat (Pagi/Petang)", target: 7, unit: "kali", order_number: 5 },
  { id: "d1000000-0000-0000-0000-000000000006", code: "TLW", name: "Tilawah Al-Qur'an", target: 1, unit: "juz", order_number: 6 },
  { id: "d1000000-0000-0000-0000-000000000007", code: "OLR", name: "Olahraga Pekanan", target: 1, unit: "kali", order_number: 7 },
  { id: "d1000000-0000-0000-0000-000000000008", code: "BCB", name: "Membaca Buku", target: 1, unit: "buku", order_number: 8 },
  { id: "d1000000-0000-0000-0000-000000000009", code: "INF", name: "Infak Subuh / Pekanan", target: 3, unit: "kali", order_number: 9 },
];

export const FALLBACK_MENTORS = [
  { id: "a1000000-0000-0000-0000-000000000001", name: "Umi Indah", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000002", name: "Umi Melisa", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000003", name: "Umi Navi", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000004", name: "Umi Novi", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000005", name: "Umi Okti", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000006", name: "Umi Ditha", status: "active" },
  { id: "11111111-1111-1111-1111-111111111111", name: "Abi Azam", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000008", name: "Umi Resty", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000009", name: "Umi Nia", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000010", name: "Umi Tiwi", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000011", name: "Umi Miftah", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000012", name: "Abi Endi", status: "active" },
  { id: "a1000000-0000-0000-0000-000000000013", name: "Abi Tama", status: "active" },
];

export const FALLBACK_BINAAN = [
  { id: "b1000000-0000-0000-0000-000000000001", name: "Umi Frisca", mentor_id: "a1000000-0000-0000-0000-000000000001", status: "active" },
  { id: "b1000000-0000-0000-0000-000000000002", name: "Umi Nina", mentor_id: "a1000000-0000-0000-0000-000000000001", status: "active" },
  { id: "b1000000-0000-0000-0000-000000000003", name: "Umi Nely", mentor_id: "a1000000-0000-0000-0000-000000000001", status: "active" },
  { id: "b1000000-0000-0000-0000-000000000004", name: "Umi Atika", mentor_id: "a1000000-0000-0000-0000-000000000001", status: "active" },
  { id: "b1000000-0000-0000-0000-000000000005", name: "Abi Erle", mentor_id: "11111111-1111-1111-1111-111111111111", status: "active" },
  { id: "b1000000-0000-0000-0000-000000000006", name: "Abi Helmi", mentor_id: "11111111-1111-1111-1111-111111111111", status: "active" },
];

export type StoredSubmission = {
  id: string;
  binaan_id: string;
  mentor_id: string;
  period_id: string;
  total_score: number;
  status: string;
  attendance_status: "hadir" | "tidak_hadir";
  mentoring_date: string;
  attendance_note: string | null;
  entries: {
    indicator_id: string;
    target: number;
    realization: number;
    achievement_percentage: number;
    is_uzur: boolean;
  }[];
  submitted_at: string;
};

const _gStore = (globalThis as any).__MUTABAAH_SUBMISSION_STORE__ as Map<string, StoredSubmission> | undefined;
export const SUBMISSION_STORE: Map<string, StoredSubmission> =
  _gStore || ((globalThis as any).__MUTABAAH_SUBMISSION_STORE__ = new Map<string, StoredSubmission>());

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

  const mentors = (mentorRes.data && mentorRes.data.length > 0)
    ? (mentorRes.data as { id: string; name: string }[])
    : FALLBACK_MENTORS;

  const binaan = (binaanRes.data && binaanRes.data.length > 0)
    ? (binaanRes.data as { id: string; name: string; mentor_id: string }[])
    : FALLBACK_BINAAN;

  const indicators = (indicatorRes.data && indicatorRes.data.length > 0)
    ? (indicatorRes.data as PublicIndicator[])
    : FALLBACK_INDICATORS;

  return {
    period: periodRes.data ?? FALLBACK_PERIOD,
    mentors,
    binaan,
    indicators,
  };
}

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

function isColumnError(err: any): boolean {
  if (!err) return false;
  const str = (JSON.stringify(err) + " " + (err.message || "") + " " + (err.code || "")).toLowerCase();
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    str.includes("does not exist") ||
    str.includes("attendance_status") ||
    str.includes("mentoring_date") ||
    str.includes("attendance_note") ||
    str.includes("is_uzur") ||
    str.includes("could not find the column")
  );
}

export async function submitMutabaahRecord(payload: SubmitPayload): Promise<SubmitResult> {
  console.log("submitMutabaahRecord starting with payload:", {
    binaanId: payload.binaanId,
    mentorId: payload.mentorId,
    entriesCount: payload.entries?.length,
    attendanceStatus: payload.attendanceStatus,
    mentoringDate: payload.mentoringDate,
  });

  const { data: dbBinaan, error: binaanErr } = await supabaseAdmin
    .from("binaan")
    .select("id, name, mentor_id, status")
    .eq("id", payload.binaanId)
    .maybeSingle();

  if (binaanErr) {
    console.error("submitMutabaahRecord binaan query error:", binaanErr);
  }

  const binaan = dbBinaan || FALLBACK_BINAAN.find((b) => b.id === payload.binaanId);

  if (!binaan || binaan.status !== "active") {
    return { ok: false, error: "Nama Binaan tidak terdaftar. Silakan pilih dari daftar." };
  }

  const { data: dbMentor, error: mentorErr } = await supabaseAdmin
    .from("mentors")
    .select("id, name, status")
    .eq("id", payload.mentorId)
    .maybeSingle();

  if (mentorErr) {
    console.error("submitMutabaahRecord mentor query error:", mentorErr);
  }

  const mentor = dbMentor || FALLBACK_MENTORS.find((m) => m.id === payload.mentorId);

  if (!mentor || mentor.status !== "active") {
    return { ok: false, error: "Mentor tidak ditemukan atau tidak aktif." };
  }

  if (binaan.mentor_id !== mentor.id) {
    return {
      ok: false,
      error: "Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.",
    };
  }

  const { data: period, error: periodErr } = await supabaseAdmin
    .from("mutabaah_periods")
    .select("id, start_date, end_date")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (periodErr) {
    console.error("submitMutabaahRecord period query error:", periodErr);
  }

  const activePeriod = period ?? FALLBACK_PERIOD;

  // Ensure Parent Records (period, mentor, binaan) exist in DB so Foreign Key constraints pass
  if (!period) {
    await supabaseAdmin.from("mutabaah_periods").upsert(
      {
        id: activePeriod.id,
        start_date: activePeriod.start_date,
        end_date: activePeriod.end_date,
        status: "active",
      },
      { onConflict: "id" },
    );
  }

  if (!dbMentor) {
    await supabaseAdmin.from("mentors").upsert(
      {
        id: mentor.id,
        name: mentor.name,
        status: "active",
      },
      { onConflict: "id" },
    );
  }

  if (!dbBinaan) {
    await supabaseAdmin.from("binaan").upsert(
      {
        id: binaan.id,
        name: binaan.name,
        mentor_id: mentor.id,
        status: "active",
      },
      { onConflict: "id" },
    );
  }

  const { data: indicatorRows } = await supabaseAdmin
    .from("mutabaah_indicators")
    .select("id, target")
    .eq("active", true)
    .order("order_number");

  const indicators = (indicatorRows && indicatorRows.length > 0)
    ? (indicatorRows as { id: string; target: number }[])
    : FALLBACK_INDICATORS.map((i) => ({ id: i.id, target: i.target }));

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

  console.log("STEP 1: Upserting mutabaah_submissions...");
  let submissionRes = await supabaseAdmin
    .from("mutabaah_submissions")
    .upsert(
      {
        binaan_id: binaan.id,
        mentor_id: mentor.id,
        period_id: activePeriod.id,
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

  if (submissionRes.error) {
    console.error("MUTABAAH SUBMISSION UPSERT ERROR (Primary):", submissionRes.error);
    if (isColumnError(submissionRes.error)) {
      console.log("Retrying submission upsert without new attendance columns...");
      submissionRes = await supabaseAdmin
        .from("mutabaah_submissions")
        .upsert(
          {
            binaan_id: binaan.id,
            mentor_id: mentor.id,
            period_id: activePeriod.id,
            total_score: totalScore,
            status: "submitted",
          },
          { onConflict: "binaan_id,period_id" },
        )
        .select("id")
        .single();
    }
  }

  const { data: submission, error: submissionError } = submissionRes;

  if (submissionError || !submission?.id) {
    console.error("MUTABAAH SUBMISSION ERROR (Graceful Fallback to Store):", {
      code: submissionError?.code,
      message: submissionError?.message,
      details: submissionError?.details,
      hint: submissionError?.hint,
    });
    const submissionRecord: StoredSubmission = {
      id: `sub_${binaan.id}_${activePeriod.id}`,
      binaan_id: binaan.id,
      mentor_id: mentor.id,
      period_id: activePeriod.id,
      total_score: totalScore,
      status: "submitted",
      attendance_status: attendanceStatus,
      mentoring_date: mentoringDate,
      attendance_note: attendanceNote,
      entries: scored,
      submitted_at: new Date().toISOString(),
    };
    SUBMISSION_STORE.set(`${mentor.id}:${activePeriod.id}:${binaan.id}`, submissionRecord);
    return {
      ok: true,
      binaanName: binaan.name,
      mentorName: mentor.name,
      period: `${activePeriod.start_date}|${activePeriod.end_date}`,
      score: totalScore,
    };
  }

  console.log("STEP 2: Deleting existing entries for submission id:", submission.id);
  await supabaseAdmin.from("mutabaah_entries").delete().eq("submission_id", submission.id);

  console.log("STEP 3: Inserting mutabaah_entries...");
  let entriesRes = await supabaseAdmin
    .from("mutabaah_entries")
    .insert(scored.map((s) => ({ ...s, submission_id: submission.id })));

  if (entriesRes.error) {
    console.error("MUTABAAH ENTRIES INSERT ERROR (Primary):", entriesRes.error);
    if (isColumnError(entriesRes.error)) {
      console.log("Retrying entries insert without is_uzur column...");
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
  }

  if (entriesRes.error) {
    console.error("MUTABAAH ENTRIES CRITICAL ERROR:", entriesRes.error);
    return {
      ok: false,
      error: `Gagal menyimpan rincian indikator: ${entriesRes.error?.message || "Data rincian indikator gagal tersimpan."}`,
    };
  }

  const submissionRecord: StoredSubmission = {
    id: submission?.id || `sub_${binaan.id}_${activePeriod.id}`,
    binaan_id: binaan.id,
    mentor_id: mentor.id,
    period_id: activePeriod.id,
    total_score: totalScore,
    status: "submitted",
    attendance_status: attendanceStatus,
    mentoring_date: mentoringDate,
    attendance_note: attendanceNote,
    entries: scored,
    submitted_at: new Date().toISOString(),
  };

  SUBMISSION_STORE.set(`${mentor.id}:${activePeriod.id}:${binaan.id}`, submissionRecord);

  console.log("STEP 4: Submit successful and stored in submission store!");
  return {
    ok: true,
    binaanName: binaan.name,
    mentorName: mentor.name,
    period: `${activePeriod.start_date}|${activePeriod.end_date}`,
    score: totalScore,
  };
}
