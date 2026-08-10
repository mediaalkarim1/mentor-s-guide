import type { SupabaseClient } from "@supabase/supabase-js";
import { averageScore, monthLabel } from "./mutabaah-config";

type DB = SupabaseClient<any, "public", any>;

export type Period = { id: string; start_date: string; end_date: string; status: string };

export async function listPeriods(supabase: DB): Promise<Period[]> {
  const { data } = await supabase
    .from("mutabaah_periods")
    .select("id, start_date, end_date, status")
    .order("start_date", { ascending: false });
  const periods = (data ?? []) as Period[];
  if (periods.length === 0) {
    return [
      { id: "p1000000-0000-0000-0000-000000000004", start_date: "2026-08-10", end_date: "2026-08-16", status: "active" },
    ];
  }
  return periods;
}

export async function resolvePeriod(supabase: DB, periodId?: string): Promise<Period | null> {
  const periods = await listPeriods(supabase);
  if (periodId) return periods.find((p) => p.id === periodId) ?? null;
  return periods.find((p) => p.status === "active") ?? periods[0] ?? null;
}

export type IndicatorRow = {
  id: string;
  code: string;
  name: string;
  target: number;
  unit: string;
  order_number?: number;
};

export async function listIndicators(supabase: DB): Promise<IndicatorRow[]> {
  const { data } = await supabase
    .from("mutabaah_indicators")
    .select("id, code, name, target, unit, order_number")
    .eq("active", true)
    .order("order_number");
  return (data ?? []) as IndicatorRow[];
}

/* ---------------------------------- Overrides (DB) --------------------------------- */

export type MentorOverride = {
  mentor_id: string;
  period_id: string;
  is_override: boolean;
  manual_weekly_score: number | null;
  manual_monthly_score: number | null;
  manual_status: string | null;
};

export async function listMentorOverrides(supabase: DB, periodId?: string | null) {
  let query = supabase
    .from("mentor_recap_overrides")
    .select("mentor_id, period_id, is_override, manual_weekly_score, manual_monthly_score, manual_status")
    .eq("is_override", true);
  if (periodId) query = query.eq("period_id", periodId);
  const { data } = await query;
  return (data ?? []) as MentorOverride[];
}

export async function setMentorOverrideRow(
  supabase: DB,
  input: {
    mentorId: string;
    periodId: string;
    isOverride: boolean;
    manualWeeklyScore?: number | undefined;
    manualMonthlyScore?: number | undefined;
    manualStatus?: string | undefined;
  },
) {
  if (!input.isOverride) {
    const { error } = await supabase
      .from("mentor_recap_overrides")
      .delete()
      .eq("mentor_id", input.mentorId)
      .eq("period_id", input.periodId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  }

  const { error } = await supabase.from("mentor_recap_overrides").upsert(
    {
      mentor_id: input.mentorId,
      period_id: input.periodId,
      is_override: true,
      manual_weekly_score: input.manualWeeklyScore ?? null,
      manual_monthly_score: input.manualMonthlyScore ?? null,
      manual_status: input.manualStatus ?? null,
    },
    { onConflict: "mentor_id,period_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/* ------------------------------- Weekly mentor recap ------------------------------- */

export type RecapRow = {
  binaanId: string;
  name: string;
  filled: boolean;
  scores: Record<string, number>;
  total: number;
};

export type MentorRecap = {
  period: Period | null;
  periods: Period[];
  indicators: IndicatorRow[];
  rows: RecapRow[];
  average: number;
  filledCount: number;
  missingCount: number;
};

export async function buildMentorRecap(
  supabase: DB,
  mentorId: string,
  periodId?: string,
): Promise<MentorRecap> {
  const [periods, indicators] = await Promise.all([listPeriods(supabase), listIndicators(supabase)]);
  const period = periodId
    ? (periods.find((p) => p.id === periodId) ?? null)
    : (periods.find((p) => p.status === "active") ?? periods[0] ?? null);

  const { data: binaanRows } = await supabase
    .from("binaan")
    .select("id, name")
    .eq("mentor_id", mentorId)
    .eq("status", "active")
    .order("name");

  const rows: RecapRow[] = [];

  if (period) {
    const { data: subs } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, total_score, mutabaah_entries(indicator_id, achievement_percentage)")
      .eq("mentor_id", mentorId)
      .eq("period_id", period.id);

    const subByBinaan = new Map<string, any>();
    (subs ?? []).forEach((s: any) => subByBinaan.set(s.binaan_id, s));

    for (const b of (binaanRows ?? []) as any[]) {
      const sub = subByBinaan.get(b.id);
      const scores: Record<string, number> = {};
      if (sub?.mutabaah_entries) {
        for (const e of sub.mutabaah_entries) {
          scores[e.indicator_id] = Number(e.achievement_percentage ?? 0);
        }
      }
      rows.push({
        binaanId: b.id,
        name: b.name,
        filled: Boolean(sub),
        scores,
        total: sub ? Number(sub.total_score) : 0,
      });
    }
  } else {
    for (const b of (binaanRows ?? []) as any[]) {
      rows.push({ binaanId: b.id, name: b.name, filled: false, scores: {}, total: 0 });
    }
  }

  const filled = rows.filter((r) => r.filled);

  return {
    period,
    periods,
    indicators,
    rows,
    average: averageScore(filled.map((r) => r.total)),
    filledCount: filled.length,
    missingCount: Math.max(0, rows.length - filled.length),
  };
}

/* --------------------------------- Mentor summaries -------------------------------- */

export type MentorSummary = {
  mentorId: string;
  mentorName: string;
  binaanCount: number;
  filled: number;
  missing: number;
  weeklyScore: number;
  monthlyScore: number;
  isOverride: boolean;
  manualWeeklyScore?: number | undefined;
  manualMonthlyScore?: number | undefined;
  manualStatus?: string | undefined;
  source: "Otomatis" | "Manual Admin";
};

const MASTER_MENTORS_FALLBACK = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Abi Azam" },
  { id: "a1000000-0000-0000-0000-000000000012", name: "Abi Endi" },
  { id: "a1000000-0000-0000-0000-000000000013", name: "Abi Tama" },
  { id: "a1000000-0000-0000-0000-000000000006", name: "Umi Ditha" },
  { id: "a1000000-0000-0000-0000-000000000001", name: "Umi Indah" },
  { id: "a1000000-0000-0000-0000-000000000002", name: "Umi Melisa" },
  { id: "a1000000-0000-0000-0000-000000000011", name: "Umi Miftah" },
  { id: "a1000000-0000-0000-0000-000000000003", name: "Umi Navi" },
  { id: "a1000000-0000-0000-0000-000000000009", name: "Umi Nia" },
  { id: "a1000000-0000-0000-0000-000000000004", name: "Umi Novi" },
  { id: "a1000000-0000-0000-0000-000000000005", name: "Umi Okti" },
  { id: "a1000000-0000-0000-0000-000000000008", name: "Umi Resty" },
  { id: "a1000000-0000-0000-0000-000000000010", name: "Umi Tiwi" },
];

export async function buildMentorSummaries(
  supabase: DB,
  periodId: string | null,
  monthPeriodIds: string[],
): Promise<MentorSummary[]> {
  const [{ data: mentors }, { data: binaan }, { data: subs }, overrides] = await Promise.all([
    supabase.from("mentors").select("id, name").eq("status", "active").order("name"),
    supabase.from("binaan").select("id, mentor_id").eq("status", "active"),
    supabase.from("mutabaah_submissions").select("mentor_id, binaan_id, period_id, total_score"),
    listMentorOverrides(supabase, periodId),
  ]);

  const overrideByMentor = new Map(overrides.map((o) => [o.mentor_id, o]));
  const mentorList = (mentors && mentors.length > 0) ? mentors : MASTER_MENTORS_FALLBACK;

  return (mentorList as any[]).map((m) => {
    const own = ((binaan ?? []) as any[]).filter((b) => b.mentor_id === m.id);
    const weekSubs = ((subs ?? []) as any[]).filter(
      (s) => s.mentor_id === m.id && periodId && s.period_id === periodId,
    );
    const weeklyByPeriod = monthPeriodIds
      .map((pid) => {
        const rows = ((subs ?? []) as any[]).filter((s) => s.mentor_id === m.id && s.period_id === pid);
        return rows.length ? averageScore(rows.map((r) => Number(r.total_score))) : null;
      })
      .filter((v): v is number => v !== null);

    const calcWeekly = averageScore(weekSubs.map((s) => Number(s.total_score)));
    const calcMonthly = averageScore(weeklyByPeriod);

    const override = overrideByMentor.get(m.id);
    const isOverride = Boolean(override?.is_override);

    return {
      mentorId: m.id,
      mentorName: m.name,
      binaanCount: own.length,
      filled: weekSubs.length,
      missing: Math.max(0, own.length - weekSubs.length),
      weeklyScore:
        isOverride && override?.manual_weekly_score !== null && override?.manual_weekly_score !== undefined
          ? Number(override.manual_weekly_score)
          : calcWeekly,
      monthlyScore:
        isOverride && override?.manual_monthly_score !== null && override?.manual_monthly_score !== undefined
          ? Number(override.manual_monthly_score)
          : calcMonthly,
      isOverride,
      manualWeeklyScore:
        override?.manual_weekly_score !== null && override?.manual_weekly_score !== undefined
          ? Number(override.manual_weekly_score)
          : undefined,
      manualMonthlyScore:
        override?.manual_monthly_score !== null && override?.manual_monthly_score !== undefined
          ? Number(override.manual_monthly_score)
          : undefined,
      manualStatus: override?.manual_status ?? undefined,
      source: isOverride ? "Manual Admin" : "Otomatis",
    };
  });
}

/* ----------------------------------- Binaan detail --------------------------------- */

export async function buildBinaanDetail(supabase: DB, binaanId: string, periodId?: string) {
  const { data: binaan } = await supabase
    .from("binaan")
    .select("id, name, mentor_id")
    .eq("id", binaanId)
    .maybeSingle();

  if (!binaan) {
    return { binaan: null, period: null, entries: [], history: [] };
  }

  const [periods, indicators] = await Promise.all([listPeriods(supabase), listIndicators(supabase)]);
  const period = periodId
    ? (periods.find((p) => p.id === periodId) ?? null)
    : (periods.find((p) => p.status === "active") ?? periods[0] ?? null);

  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select("id, period_id, total_score, mutabaah_entries(indicator_id, target, realization, achievement_percentage)")
    .eq("binaan_id", binaanId);

  const current = ((subs ?? []) as any[]).find((s) => period && s.period_id === period.id);

  const entries = period && current
    ? indicators.map((ind) => {
        const e = (current.mutabaah_entries ?? []).find((x: any) => x.indicator_id === ind.id);
        return {
          name: ind.name,
          target: Number(e?.target ?? ind.target),
          unit: ind.unit,
          realization: Number(e?.realization ?? 0),
          score: Number(e?.achievement_percentage ?? 0),
        };
      })
    : [];

  const history = periods
    .map((p) => {
      const sub = ((subs ?? []) as any[]).find((s) => s.period_id === p.id);
      if (!sub) return null;
      return {
        periodId: p.id,
        start_date: p.start_date,
        end_date: p.end_date,
        score: Number(sub.total_score),
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return { binaan: { id: binaan.id, name: binaan.name }, period, entries, history };
}

/* ---------------------------------- Mentor history --------------------------------- */

export async function buildMentorHistory(supabase: DB, mentorId: string) {
  const periods = await listPeriods(supabase);
  const [{ data: subs }, overrides] = await Promise.all([
    supabase
      .from("mutabaah_submissions")
      .select("period_id, total_score")
      .eq("mentor_id", mentorId),
    listMentorOverrides(supabase, null),
  ]);

  const overrideByPeriod = new Map(
    overrides.filter((o) => o.mentor_id === mentorId).map((o) => [o.period_id, o]),
  );

  return periods.map((p) => {
    const rows = ((subs ?? []) as any[]).filter((s) => s.period_id === p.id);
    const calculated = rows.length ? averageScore(rows.map((r) => Number(r.total_score))) : 0;
    const override = overrideByPeriod.get(p.id);
    const isOverride = Boolean(override?.is_override);
    return {
      periodId: p.id,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status,
      score:
        isOverride && override?.manual_weekly_score !== null && override?.manual_weekly_score !== undefined
          ? Number(override.manual_weekly_score)
          : calculated,
      isOverride,
      filled: rows.length,
    };
  });
}

/* -------------------------------- Monthly binaan recap ----------------------------- */

function monthsFrom(periods: Period[]) {
  return Array.from(new Set(periods.map((p) => monthLabel(p.start_date))));
}

export async function buildBinaanMonthlyRecap(supabase: DB, mentorId: string, month?: string) {
  const periods = await listPeriods(supabase);
  const months = monthsFrom(periods);
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? "");
  const monthPeriods = periods
    .filter((p) => monthLabel(p.start_date) === selectedMonth)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const [{ data: mentor }, { data: binaan }] = await Promise.all([
    supabase.from("mentors").select("name").eq("id", mentorId).maybeSingle(),
    supabase
      .from("binaan")
      .select("id, name")
      .eq("mentor_id", mentorId)
      .eq("status", "active")
      .order("name"),
  ]);

  const periodIds = monthPeriods.map((p) => p.id);
  const { data: subs } = periodIds.length
    ? await supabase
        .from("mutabaah_submissions")
        .select("binaan_id, period_id, total_score")
        .eq("mentor_id", mentorId)
        .in("period_id", periodIds)
    : { data: [] as any[] };

  const rows = ((binaan ?? []) as any[]).map((b) => {
    const weeklyScores = monthPeriods.map((p) => {
      const sub = ((subs ?? []) as any[]).find((s) => s.binaan_id === b.id && s.period_id === p.id);
      return sub ? Number(sub.total_score) : null;
    });
    const filled = weeklyScores.filter((v): v is number => v !== null);
    return {
      binaanId: b.id,
      binaanName: b.name,
      weeklyScores,
      monthlyAverage: averageScore(filled),
    };
  });

  return {
    months,
    month: selectedMonth,
    periods: monthPeriods,
    rows,
    mentorName: mentor?.name ?? "-",
  };
}

export async function buildSingleBinaanMonthlyDetail(supabase: DB, binaanId: string, month?: string) {
  const [periods, indicators] = await Promise.all([listPeriods(supabase), listIndicators(supabase)]);
  const months = monthsFrom(periods);
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? "");
  const monthPeriods = periods
    .filter((p) => monthLabel(p.start_date) === selectedMonth)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const { data: binaan } = await supabase
    .from("binaan")
    .select("id, name, mentor_id, mentors(name)")
    .eq("id", binaanId)
    .maybeSingle();

  const periodIds = monthPeriods.map((p) => p.id);
  const { data: subs } = periodIds.length
    ? await supabase
        .from("mutabaah_submissions")
        .select("period_id, total_score, mutabaah_entries(indicator_id, realization, achievement_percentage)")
        .eq("binaan_id", binaanId)
        .in("period_id", periodIds)
    : { data: [] as any[] };

  const weeklyBreakdown = monthPeriods.map((p, index) => {
    const sub = ((subs ?? []) as any[]).find((s) => s.period_id === p.id);
    return {
      periodId: p.id,
      weekNumber: index + 1,
      startDate: p.start_date,
      endDate: p.end_date,
      score: sub ? Number(sub.total_score) : null,
    };
  });

  const indicatorSummary = indicators.map((ind) => {
    const values = ((subs ?? []) as any[]).flatMap((s) =>
      (s.mutabaah_entries ?? []).filter((e: any) => e.indicator_id === ind.id),
    );
    const avgScore = averageScore(values.map((v: any) => Number(v.achievement_percentage ?? 0)));
    const avgRealization = values.length
      ? Math.round(
          (values.reduce((sum: number, v: any) => sum + Number(v.realization ?? 0), 0) / values.length) * 100,
        ) / 100
      : 0;
    return {
      id: ind.id,
      name: ind.name,
      target: Number(ind.target),
      unit: ind.unit,
      avgScore,
      avgRealization,
    };
  });

  const filled = weeklyBreakdown.map((w) => w.score).filter((v): v is number => v !== null);

  return {
    binaanId,
    binaanName: binaan?.name ?? "-",
    mentorName: (binaan as any)?.mentors?.name ?? "-",
    month: selectedMonth,
    monthlyAverage: averageScore(filled),
    weeklyBreakdown,
    indicatorSummary,
  };
}

/* ------------------------------------- Exports ------------------------------------- */

export async function buildExportRows(supabase: DB, periodId?: string) {
  const [period, indicators] = await Promise.all([
    resolvePeriod(supabase, periodId),
    listIndicators(supabase),
  ]);
  if (!period) return [];

  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select(
      "total_score, binaan(name), mentors(name), mutabaah_entries(indicator_id, achievement_percentage)",
    )
    .eq("period_id", period.id);

  return ((subs ?? []) as any[]).map((s) => ({
    mentor: s.mentors?.name ?? "-",
    binaan: s.binaan?.name ?? "-",
    period: `${period.start_date} s/d ${period.end_date}`,
    scores: indicators.map((ind) => ({
      name: ind.name,
      score: Number(
        (s.mutabaah_entries ?? []).find((e: any) => e.indicator_id === ind.id)?.achievement_percentage ?? 0,
      ),
    })),
    total: Number(s.total_score),
  }));
}

/* -------------------------------------- Reset -------------------------------------- */

export async function resetMentorRecapServer(
  supabase: DB,
  mentorId: string,
  scope: "weekly" | "monthly" | "all",
  periodId: string | null,
  monthIds: string[],
) {
  let targetPeriodIds: string[] = [];
  if (scope === "weekly") targetPeriodIds = periodId ? [periodId] : [];
  else if (scope === "monthly") targetPeriodIds = monthIds;

  if (scope === "all") {
    const { data: subs } = await supabase
      .from("mutabaah_submissions")
      .select("id")
      .eq("mentor_id", mentorId);
    const ids = ((subs ?? []) as any[]).map((s) => s.id);
    if (ids.length) {
      await supabase.from("mutabaah_entries").delete().in("submission_id", ids);
      await supabase.from("mutabaah_submissions").delete().in("id", ids);
    }
    await supabase.from("mentor_recap_overrides").delete().eq("mentor_id", mentorId);
    return { ok: true as const, deleted: ids.length };
  }

  if (!targetPeriodIds.length) return { ok: false as const, error: "Periode tidak ditemukan." };

  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select("id")
    .eq("mentor_id", mentorId)
    .in("period_id", targetPeriodIds);
  const ids = ((subs ?? []) as any[]).map((s) => s.id);
  if (ids.length) {
    await supabase.from("mutabaah_entries").delete().in("submission_id", ids);
    await supabase.from("mutabaah_submissions").delete().in("id", ids);
  }
  await supabase
    .from("mentor_recap_overrides")
    .delete()
    .eq("mentor_id", mentorId)
    .in("period_id", targetPeriodIds);

  return { ok: true as const, deleted: ids.length };
}
