import type { SupabaseClient } from "@supabase/supabase-js";
import { averageScore } from "./mutabaah-config";
import { clearMentorOverride, getMentorOverride } from "./recap_overrides.server";

type DB = SupabaseClient<any, "public", any>;

export type Period = { id: string; start_date: string; end_date: string; status: string };

export async function listPeriods(supabase: DB): Promise<Period[]> {
  const { data } = await supabase
    .from("mutabaah_periods")
    .select("id, start_date, end_date, status")
    .order("start_date", { ascending: false });
  return (data ?? []) as Period[];
}

export async function resolvePeriod(supabase: DB, periodId?: string): Promise<Period | null> {
  const periods = await listPeriods(supabase);
  if (periodId) return periods.find((p) => p.id === periodId) ?? null;
  return periods.find((p) => p.status === "active") ?? periods[0] ?? null;
}

export type IndicatorRow = { id: string; code: string; name: string; target: number; unit: string };

export async function listIndicators(supabase: DB): Promise<IndicatorRow[]> {
  const { data } = await supabase
    .from("mutabaah_indicators")
    .select("id, code, name, target, unit, order_number, active")
    .eq("active", true)
    .order("order_number");
  return (data ?? []) as IndicatorRow[];
}

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
  const [periods, indicators] = await Promise.all([
    listPeriods(supabase),
    listIndicators(supabase),
  ]);
  const period = periodId
    ? (periods.find((p) => p.id === periodId) ?? null)
    : (periods.find((p) => p.status === "active") ?? periods[0] ?? null);

  const { data: binaanRows } = await supabase
    .from("binaan")
    .select("id, name")
    .eq("mentor_id", mentorId)
    .eq("status", "active")
    .order("name");

  const binaanList = binaanRows ?? [];
  const rows: RecapRow[] = [];

  if (period) {
    const { data: submissions } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, total_score, mutabaah_entries(indicator_id, achievement_percentage)")
      .eq("mentor_id", mentorId)
      .eq("period_id", period.id);

    const subByBinaan = new Map((submissions ?? []).map((s: any) => [s.binaan_id, s]));
    for (const b of binaanList) {
      const sub: any = subByBinaan.get(b.id);
      const scores: Record<string, number> = {};
      if (sub) {
        for (const e of sub.mutabaah_entries ?? []) {
          scores[e.indicator_id] = Number(e.achievement_percentage);
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
  }

  const filled = rows.filter((r) => r.filled);
  const calculatedAvg = averageScore(filled.map((r) => r.total));

  // Check if Admin set manual override for mentor
  const override = getMentorOverride(mentorId);
  const finalAvg = override?.isOverride && override.manualWeeklyScore !== undefined
    ? override.manualWeeklyScore
    : calculatedAvg;

  return {
    period,
    periods,
    indicators,
    rows,
    average: finalAvg,
    filledCount: filled.length,
    missingCount: rows.length - filled.length,
  };
}

export type BinaanDetail = {
  binaan: { id: string; name: string } | null;
  period: Period | null;
  entries: { name: string; target: number; unit: string; realization: number; score: number }[];
  history: { periodId: string; start_date: string; end_date: string; score: number }[];
};

export async function buildBinaanDetail(
  supabase: DB,
  binaanId: string,
  periodId?: string,
): Promise<BinaanDetail> {
  const { data: binaan } = await supabase
    .from("binaan")
    .select("id, name")
    .eq("id", binaanId)
    .maybeSingle();

  if (!binaan) return { binaan: null, period: null, entries: [], history: [] };

  const { data: submissions } = await supabase
    .from("mutabaah_submissions")
    .select(
      "id, total_score, period_id, mutabaah_periods(id, start_date, end_date, status), mutabaah_entries(indicator_id, target, realization, achievement_percentage, mutabaah_indicators(name, unit, order_number))",
    )
    .eq("binaan_id", binaanId);

  const list = (submissions ?? []) as any[];
  const history = list
    .map((s) => ({
      periodId: s.period_id,
      start_date: s.mutabaah_periods?.start_date as string,
      end_date: s.mutabaah_periods?.end_date as string,
      score: Number(s.total_score),
    }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const target = periodId
    ? list.find((s) => s.period_id === periodId)
    : (list
        .slice()
        .sort((a, b) =>
          (a.mutabaah_periods?.start_date ?? "").localeCompare(b.mutabaah_periods?.start_date ?? ""),
        )
        .pop() ?? null);

  const entries = target
    ? ((target.mutabaah_entries ?? []) as any[])
        .slice()
        .sort(
          (a, b) =>
            (a.mutabaah_indicators?.order_number ?? 0) - (b.mutabaah_indicators?.order_number ?? 0),
        )
        .map((e) => ({
          name: e.mutabaah_indicators?.name ?? "-",
          unit: e.mutabaah_indicators?.unit ?? "",
          target: Number(e.target),
          realization: Number(e.realization),
          score: Number(e.achievement_percentage),
        }))
    : [];

  return {
    binaan: { id: binaan.id, name: binaan.name },
    period: target?.mutabaah_periods ?? null,
    entries,
    history,
  };
}

export type MentorSummary = {
  mentorId: string;
  mentorName: string;
  binaanCount: number;
  filled: number;
  missing: number;
  weeklyScore: number;
  monthlyScore: number;
  isOverride: boolean;
  manualWeeklyScore?: number;
  manualMonthlyScore?: number;
  manualStatus?: string;
  source: "Otomatis" | "Manual Admin";
};

export async function buildMentorSummaries(
  supabase: DB,
  periodId: string | null,
  monthPeriodIds: string[],
): Promise<MentorSummary[]> {
  const { data: mentors } = await supabase
    .from("mentors")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  const { data: binaan } = await supabase.from("binaan").select("id, mentor_id").eq("status", "active");
  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select("mentor_id, period_id, total_score");

  const submissions = subs ?? [];
  return (mentors ?? []).map((m: any) => {
    const own = (binaan ?? []).filter((b: any) => b.mentor_id === m.id);
    const weekSubs = submissions.filter(
      (s: any) => s.mentor_id === m.id && periodId && s.period_id === periodId,
    );
    const weeklyByPeriod = monthPeriodIds
      .map((pid) => {
        const rows = submissions.filter((s: any) => s.mentor_id === m.id && s.period_id === pid);
        return rows.length ? averageScore(rows.map((r: any) => Number(r.total_score))) : null;
      })
      .filter((v): v is number => v !== null);

    const calcWeekly = averageScore(weekSubs.map((s: any) => Number(s.total_score)));
    const calcMonthly = averageScore(weeklyByPeriod);

    const override = getMentorOverride(m.id);
    const isOverride = Boolean(override?.isOverride);

    return {
      mentorId: m.id,
      mentorName: m.name,
      binaanCount: own.length,
      filled: weekSubs.length,
      missing: Math.max(0, own.length - weekSubs.length),
      weeklyScore: isOverride && override?.manualWeeklyScore !== undefined ? override.manualWeeklyScore : calcWeekly,
      monthlyScore: isOverride && override?.manualMonthlyScore !== undefined ? override.manualMonthlyScore : calcMonthly,
      isOverride,
      manualWeeklyScore: override?.manualWeeklyScore,
      manualMonthlyScore: override?.manualMonthlyScore,
      manualStatus: override?.manualStatus,
      source: isOverride ? "Manual Admin" : "Otomatis",
    };
  });
}

export async function resetMentorRecapServer(
  supabase: DB,
  mentorId: string,
  scope: "weekly" | "monthly" | "all",
  periodId?: string | null,
  monthPeriodIds?: string[],
) {
  // Clear manual override
  clearMentorOverride(mentorId);

  // Get all binaan for this mentor strictly filtered by mentor_id
  const { data: binaanList } = await supabase
    .from("binaan")
    .select("id")
    .eq("mentor_id", mentorId);

  const binaanIds = (binaanList ?? []).map((b) => b.id);
  if (binaanIds.length === 0) {
    return { ok: true, resetCount: 0 };
  }

  let query = supabase.from("mutabaah_submissions").delete().in("binaan_id", binaanIds);

  if (scope === "weekly" && periodId) {
    query = query.eq("period_id", periodId);
  } else if (scope === "monthly" && monthPeriodIds && monthPeriodIds.length > 0) {
    query = query.in("period_id", monthPeriodIds);
  }

  const { error } = await query;
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function buildExportRows(supabase: DB, periodId?: string) {
  let query = supabase
    .from("mutabaah_submissions")
    .select(
      "total_score, mentors(name), binaan(name), mutabaah_periods(start_date, end_date), mutabaah_entries(achievement_percentage, mutabaah_indicators(name, order_number))",
    );
  if (periodId) query = query.eq("period_id", periodId);
  const { data } = await query;
  return ((data ?? []) as any[]).map((s) => ({
    mentor: s.mentors?.name ?? "-",
    binaan: s.binaan?.name ?? "-",
    period: `${s.mutabaah_periods?.start_date} s/d ${s.mutabaah_periods?.end_date}`,
    scores: ((s.mutabaah_entries ?? []) as any[])
      .slice()
      .sort(
        (a, b) =>
          (a.mutabaah_indicators?.order_number ?? 0) - (b.mutabaah_indicators?.order_number ?? 0),
      )
      .map((e) => ({
        name: e.mutabaah_indicators?.name ?? "-",
        score: Number(e.achievement_percentage),
      })),
    total: Number(s.total_score),
  }));
}