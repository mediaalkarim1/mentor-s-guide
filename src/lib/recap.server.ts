import type { SupabaseClient } from "@supabase/supabase-js";
import { averageScore, monthLabel } from "./mutabaah-config";
import { getMentorOverride } from "./recap_overrides.server";
import { getMasterStore } from "./master_overrides.server";


type DB = SupabaseClient<any, "public", any>;

export type Period = { id: string; start_date: string; end_date: string; status: string };

export async function listPeriods(supabase: DB): Promise<Period[]> {
  const { data } = await supabase
    .from("mutabaah_periods")
    .select("id, start_date, end_date, status")
    .order("start_date", { ascending: false });
  const dbPeriods = (data && data.length > 0) ? (data as Period[]) : [];
  const storePeriods = getMasterStore().periods;

  const map = new Map<string, Period>();
  // Store first (lower priority)
  storePeriods.forEach((p) => map.set(`${p.start_date}::${p.end_date}`, p));
  // DB overrides store (higher priority)
  dbPeriods.forEach((p) => map.set(`${p.start_date}::${p.end_date}`, p));

  return Array.from(map.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
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
  const dbIndicators = (data && data.length > 0) ? (data as IndicatorRow[]) : [];
  const storeIndicators = getMasterStore().indicators;

  const map = new Map<string, IndicatorRow>();
  storeIndicators.forEach((i) => map.set(i.code.toUpperCase().trim(), i));
  dbIndicators.forEach((i) => map.set(i.code.toUpperCase().trim(), i));

  return Array.from(map.values()).sort((a, b) => ((a as any).order_number || 0) - ((b as any).order_number || 0));
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

/**
 * Get all submissions for a mentor/period as a Map keyed by binaan_id
 * Uses supabaseAdmin to bypass RLS — guarantees same view as Admin panel
 */
async function fetchSubmissionsForMentor(supabase: DB, mentorId: string, periodId: string): Promise<Map<string, any>> {
  const store = getMasterStore();
  const subByBinaan = new Map<string, any>();

  // First: load from server memory store (captures recent submissions not yet in DB)
  const storeSubmissions = (store.submissions ?? []).filter(
    (s: any) => s.mentor_id === mentorId && s.period_id === periodId,
  );
  storeSubmissions.forEach((s: any) => {
    if (s.binaan_id) subByBinaan.set(s.binaan_id, s);
    if (s.binaanName) subByBinaan.set((s.binaanName as string).toLowerCase().trim(), s);
  });

  // Then: DB query (overrides store on collision — DB is source of truth)
  try {
    const { data: dbSubs } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, total_score, mutabaah_entries(indicator_id, achievement_percentage)")
      .eq("mentor_id", mentorId)
      .eq("period_id", periodId);
    (dbSubs ?? []).forEach((s: any) => {
      if (s.binaan_id) subByBinaan.set(s.binaan_id, s);
    });
  } catch (e) {
    console.warn("fetchSubmissionsForMentor DB query error, using store only", e);
  }

  return subByBinaan;
}

/**
 * Get all binaan for a mentor — merges DB + store, deduped by normalized name
 */
async function fetchBinaanForMentor(supabase: DB, mentorId: string): Promise<any[]> {
  const store = getMasterStore();
  const storeBinaan = store.binaan.filter(
    (b) => b.mentor_id === mentorId && (b.status === "active" || !b.status),
  );

  const binaanMap = new Map<string, any>();
  // Store first (lower priority)
  storeBinaan.forEach((b) => {
    const key = (b.name || "").toLowerCase().trim();
    binaanMap.set(key, b);
  });

  // DB overrides store
  try {
    const { data: binaanRows } = await supabase
      .from("binaan")
      .select("id, name, mentor_id, status")
      .eq("mentor_id", mentorId)
      .eq("status", "active")
      .order("name");
    (binaanRows ?? []).forEach((b: any) => {
      const key = (b.name || "").toLowerCase().trim();
      binaanMap.set(key, b);
    });
  } catch (e) {
    console.warn("fetchBinaanForMentor DB query error, using store only", e);
  }

  return Array.from(binaanMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

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

  const binaanList = await fetchBinaanForMentor(supabase, mentorId);
  const subByBinaan = period ? await fetchSubmissionsForMentor(supabase, mentorId, period.id) : new Map();

  const rawRows: RecapRow[] = binaanList.map((b) => {
    const nameKey = (b.name || "").toLowerCase().trim();
    const sub: any = subByBinaan.get(b.id) ?? subByBinaan.get(nameKey);
    const scores: Record<string, number> = {};
    if (sub) {
      const entries = sub.mutabaah_entries ?? [];
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const indKey = e.indicator_id || e.indicatorId;
          scores[indKey] = Number(e.achievement_percentage ?? e.score ?? 0);
        }
      }
    }
    return {
      binaanId: b.id,
      name: b.name,
      filled: Boolean(sub),
      scores,
      total: sub ? Number(sub.total_score) : 0,
    };
  });

  // Final deduplication by name: prefer filled over unfilled
  const finalRowsMap = new Map<string, RecapRow>();
  for (const r of rawRows) {
    const key = (r.name || "").toLowerCase().trim();
    const existing = finalRowsMap.get(key);
    if (!existing || (!existing.filled && r.filled)) {
      finalRowsMap.set(key, r);
    }
  }
  const deduplicatedRows = Array.from(finalRowsMap.values());

  const filled = deduplicatedRows.filter((r) => r.filled);

  return {
    period,
    periods,
    indicators,
    rows: deduplicatedRows,
    average: averageScore(filled.map((r) => r.total)),
    filledCount: filled.length,
    missingCount: Math.max(0, deduplicatedRows.length - filled.length),
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

/**
 * Build summaries for ALL mentors — used by Admin panel.
 * Uses supabaseAdmin to bypass RLS so Admin sees ALL data.
 */
export async function buildMentorSummaries(
  supabase: DB,
  periodId: string | null,
  monthPeriodIds: string[],
): Promise<MentorSummary[]> {
  const store = getMasterStore();

  // ---- Mentors ----
  const { data: mentorsRes } = await supabase
    .from("mentors")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const mentorMap = new Map<string, any>();
  store.mentors.forEach((m) => mentorMap.set(m.name.toLowerCase().trim(), m));
  (mentorsRes ?? []).forEach((m: any) => mentorMap.set(m.name.toLowerCase().trim(), m));
  const mentors = Array.from(mentorMap.values());

  // ---- Binaan (by mentor_id) ----
  const { data: binaanRes } = await supabase
    .from("binaan")
    .select("id, name, mentor_id")
    .eq("status", "active");

  const binaanMap = new Map<string, any>();
  store.binaan.forEach((b) => {
    if (b.status === "active" || !b.status) {
      binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b);
    }
  });
  (binaanRes ?? []).forEach((b: any) => {
    binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b);
  });
  const allBinaan = Array.from(binaanMap.values());

  // ---- Submissions ----
  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select("mentor_id, binaan_id, period_id, total_score");

  const subMap = new Map<string, any>();
  // Store submissions first
  (store.submissions ?? []).forEach((s: any) => {
    const key = `${s.binaan_id || s.binaanName || ""}::${s.period_id}`;
    subMap.set(key, s);
  });
  // DB submissions override store
  (subs ?? []).forEach((s: any) => {
    const key = `${s.binaan_id}::${s.period_id}`;
    subMap.set(key, s);
  });
  const allSubmissions = Array.from(subMap.values());

  return mentors.map((m: any) => {
    // Count unique binaan for this mentor
    const ownBinaan = allBinaan.filter((b: any) => b.mentor_id === m.id);
    const binaanCount = ownBinaan.length;

    // Weekly filled: unique binaan submissions in this period
    const weekSubsRaw = periodId
      ? allSubmissions.filter(
          (s: any) => (s.mentor_id === m.id || s.mentorName === m.name) && s.period_id === periodId,
        )
      : [];

    // Deduplicate weekly subs by binaan_id (1 submission per binaan per period)
    const weekSubsByBinaan = new Map<string, any>();
    weekSubsRaw.forEach((s: any) => {
      const bKey = s.binaan_id || s.binaanName || "";
      weekSubsByBinaan.set(bKey, s);
    });
    const weekSubs = Array.from(weekSubsByBinaan.values());

    // Monthly score: average of weekly scores per period in month
    const weeklyByPeriod = monthPeriodIds
      .map((pid) => {
        const rows = allSubmissions.filter(
          (s: any) => (s.mentor_id === m.id || s.mentorName === m.name) && s.period_id === pid,
        );
        return rows.length ? averageScore(rows.map((r: any) => Number(r.total_score))) : null;
      })
      .filter((v): v is number => v !== null);

    const calcWeekly = averageScore(weekSubs.map((s: any) => Number(s.total_score)));
    const calcMonthly = averageScore(weeklyByPeriod);

    const override = getMentorOverride(m.id, periodId);
    const isOverride = Boolean(override?.isOverride);

    const filledCount = Math.min(weekSubs.length, binaanCount);

    return {
      mentorId: m.id,
      mentorName: m.name,
      binaanCount,
      filled: filledCount,
      missing: Math.max(0, binaanCount - filledCount),
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

// Buat fungsi buildMentorHistory jika diperlukan di tempat lain
export async function buildMentorHistory(supabase: DB, mentorId: string) {
  const store = getMasterStore();

  // All periods
  const periods = await listPeriods(supabase);

  // All binaan for mentor
  const binaanList = await fetchBinaanForMentor(supabase, mentorId);

  // All submissions for mentor across all periods
  const { data: allSubs } = await supabase
    .from("mutabaah_submissions")
    .select("id, binaan_id, period_id, total_score, mutabaah_entries(indicator_id, achievement_percentage)")
    .eq("mentor_id", mentorId)
    .order("period_id");

  const storeSubs = (store.submissions ?? []).filter((s: any) => s.mentor_id === mentorId);
  const subMap = new Map<string, any>();
  storeSubs.forEach((s: any) => {
    subMap.set(`${s.binaan_id || s.binaanName}::${s.period_id}`, s);
  });
  (allSubs ?? []).forEach((s: any) => {
    subMap.set(`${s.binaan_id}::${s.period_id}`, s);
  });
  const submissions = Array.from(subMap.values());

  // Group by period
  return periods.map((period) => {
    const periodSubs = submissions.filter((s: any) => s.period_id === period.id);
    const rows = binaanList.map((b) => {
      const sub = periodSubs.find((s: any) => s.binaan_id === b.id || s.binaanName === b.name);
      return {
        binaanId: b.id,
        name: b.name,
        filled: Boolean(sub),
        total: sub ? Number(sub.total_score) : 0,
      };
    });
    const filled = rows.filter((r) => r.filled);
    return {
      period,
      rows,
      filledCount: filled.length,
      missingCount: rows.length - filled.length,
      average: averageScore(filled.map((r) => r.total)),
    };
  });
}

/* ====================================================================
   BINAAN DETAIL (single binaan recap for a period)
   ==================================================================== */

export type BinaanDetail = {
  binaanId: string;
  binaanName: string;
  mentorName: string;
  period: Period | null;
  indicators: IndicatorRow[];
  scores: Record<string, number>;
  total: number;
  filled: boolean;
};

export async function buildBinaanDetail(
  supabase: DB,
  binaanId: string,
  periodId?: string,
): Promise<BinaanDetail | null> {
  const { data: binaan } = await supabase
    .from("binaan")
    .select("id, name, mentor_id, mentors(name)")
    .eq("id", binaanId)
    .maybeSingle();

  if (!binaan) return null;

  const [periods, indicators] = await Promise.all([
    listPeriods(supabase),
    listIndicators(supabase),
  ]);

  const period = periodId
    ? (periods.find((p) => p.id === periodId) ?? null)
    : (periods.find((p) => p.status === "active") ?? periods[0] ?? null);

  const scores: Record<string, number> = {};
  let total = 0;
  let filled = false;

  if (period) {
    const { data: sub } = await supabase
      .from("mutabaah_submissions")
      .select("total_score, mutabaah_entries(indicator_id, achievement_percentage)")
      .eq("binaan_id", binaanId)
      .eq("period_id", period.id)
      .maybeSingle();

    if (sub) {
      filled = true;
      total = Number(sub.total_score);
      for (const e of (sub.mutabaah_entries ?? []) as any[]) {
        const key = e.indicator_id;
        scores[key] = Number(e.achievement_percentage ?? 0);
      }
    }
  }

  return {
    binaanId: binaan.id,
    binaanName: binaan.name,
    mentorName: (binaan.mentors as any)?.name ?? "Mentor",
    period,
    indicators,
    scores,
    total,
    filled,
  };
}

/* ====================================================================
   RESET MENTOR RECAP (Admin operation)
   ==================================================================== */

export async function resetMentorRecapServer(
  supabase: DB,
  mentorId: string,
  scope: "weekly" | "monthly" | "all",
  periodId?: string | null,
  monthPeriodIds?: string[],
) {
  const { clearMentorOverride } = await import("./recap_overrides.server");
  clearMentorOverride(mentorId, periodId);

  const { data: binaanList } = await supabase
    .from("binaan")
    .select("id")
    .eq("mentor_id", mentorId);

  const binaanIds = (binaanList ?? []).map((b) => b.id);
  if (binaanIds.length === 0) {
    return { ok: true, resetCount: 0 };
  }

  let query: any = supabase.from("mutabaah_submissions").delete().in("binaan_id", binaanIds);

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

/* ====================================================================
   EXPORT ROWS (Admin CSV/Excel export)
   ==================================================================== */

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

/* ====================================================================
   REKAP BULANAN BINAAN (by Mentor — strict mentor isolation)
   ==================================================================== */

export type BinaanMonthlyRow = {
  binaanId: string;
  binaanName: string;
  weeklyScores: (number | null)[];
  monthlyAverage: number;
};

export async function buildBinaanMonthlyRecap(
  supabase: DB,
  mentorId: string,
  targetMonth?: string,
) {
  const periods = await listPeriods(supabase);
  const months = Array.from(new Set(periods.map((p) => monthLabel(p.start_date))));
  const month = targetMonth && months.includes(targetMonth) ? targetMonth : (months[0] ?? null);

  const monthPeriods = periods
    .filter((p) => month && monthLabel(p.start_date) === month)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Get binaan ONLY for this mentor (strict isolation)
  const binaanList = await fetchBinaanForMentor(supabase, mentorId);
  const monthPeriodIds = monthPeriods.map((p) => p.id);

  const { data: mentorRow } = await supabase
    .from("mentors")
    .select("name")
    .eq("id", mentorId)
    .maybeSingle();

  let submissions: any[] = [];
  if (monthPeriodIds.length > 0 && binaanList.length > 0) {
    const binaanIds = binaanList.map((b) => b.id).filter(Boolean);
    if (binaanIds.length > 0) {
      const { data: subs } = await supabase
        .from("mutabaah_submissions")
        .select("id, binaan_id, period_id, total_score")
        .in("period_id", monthPeriodIds)
        .in("binaan_id", binaanIds);
      submissions = subs ?? [];
    }
  }

  const rows: BinaanMonthlyRow[] = binaanList.map((b) => {
    const weeklyScores = monthPeriods.map((p) => {
      const sub = submissions.find((s) => s.binaan_id === b.id && s.period_id === p.id);
      return sub ? Number(sub.total_score) : null;
    });

    const validScores = weeklyScores.filter((v): v is number => v !== null);
    const monthlyAverage = averageScore(validScores);

    return {
      binaanId: b.id,
      binaanName: b.name,
      weeklyScores,
      monthlyAverage,
    };
  });

  return {
    months,
    month,
    periods: monthPeriods,
    rows,
    mentorName: mentorRow?.name ?? "Mentor",
  };
}

export async function buildSingleBinaanMonthlyDetail(
  supabase: DB,
  binaanId: string,
  targetMonth?: string,
) {
  const { data: binaan } = await supabase
    .from("binaan")
    .select("id, name, mentor_id, mentors(name)")
    .eq("id", binaanId)
    .maybeSingle();

  if (!binaan) return null;

  const [periods, indicators] = await Promise.all([
    listPeriods(supabase),
    listIndicators(supabase),
  ]);

  const months = Array.from(new Set(periods.map((p) => monthLabel(p.start_date))));
  const month = targetMonth && months.includes(targetMonth) ? targetMonth : (months[0] ?? null);

  const monthPeriods = periods
    .filter((p) => month && monthLabel(p.start_date) === month)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const monthPeriodIds = monthPeriods.map((p) => p.id);

  let submissions: any[] = [];
  if (monthPeriodIds.length > 0) {
    const { data: subs } = await supabase
      .from("mutabaah_submissions")
      .select("id, period_id, total_score, mutabaah_entries(indicator_id, realization, achievement_percentage)")
      .eq("binaan_id", binaanId)
      .in("period_id", monthPeriodIds);
    submissions = subs ?? [];
  }

  const weeklyBreakdown = monthPeriods.map((p, idx) => {
    const sub = submissions.find((s) => s.period_id === p.id);
    return {
      weekNumber: idx + 1,
      periodId: p.id,
      startDate: p.start_date,
      endDate: p.end_date,
      score: sub ? Number(sub.total_score) : null,
    };
  });

  const validScores = weeklyBreakdown.map((w) => w.score).filter((s): s is number => s !== null);
  const monthlyAverage = averageScore(validScores);

  const indicatorSummary = indicators.map((ind) => {
    let totalRealization = 0;
    let totalAchievement = 0;
    let count = 0;

    for (const sub of submissions) {
      for (const e of (sub.mutabaah_entries ?? []) as any[]) {
        if (e.indicator_id === ind.id) {
          totalRealization += Number(e.realization);
          totalAchievement += Number(e.achievement_percentage);
          count++;
        }
      }
    }

    return {
      id: ind.id,
      name: ind.name,
      target: ind.target,
      unit: ind.unit,
      avgRealization: count > 0 ? Math.round((totalRealization / count) * 100) / 100 : 0,
      avgScore: count > 0 ? Math.round((totalAchievement / count) * 100) / 100 : 0,
    };
  });

  return {
    binaanId: binaan.id,
    binaanName: binaan.name,
    mentorName: (binaan.mentors as any)?.name ?? "Mentor",
    month,
    weeklyBreakdown,
    monthlyAverage,
    indicatorSummary,
  };
}