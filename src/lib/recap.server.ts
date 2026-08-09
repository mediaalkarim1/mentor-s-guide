import type { SupabaseClient } from "@supabase/supabase-js";
import { averageScore, monthLabel } from "./mutabaah-config";
import { clearMentorOverride, getMentorOverride } from "./recap_overrides.server";
import { getMasterStore } from "./master_overrides.server";
import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIODS,
} from "./master-data";

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
  storePeriods.forEach((p) => map.set(`${p.start_date}::${p.end_date}`, p));
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

  const store = getMasterStore();
  const storeBinaanForMentor = store.binaan.filter(
    (b) => b.mentor_id === mentorId && (b.status === "active" || !b.status),
  );

  // Deduplicate binaan strictly by normalized name for this mentor
  const binaanMap = new Map<string, any>();
  storeBinaanForMentor.forEach((b) => {
    const key = (b.name || "").toLowerCase().trim();
    binaanMap.set(key, b);
  });
  (binaanRows ?? []).forEach((b: any) => {
    const key = (b.name || "").toLowerCase().trim();
    binaanMap.set(key, b);
  });

  const binaanList = Array.from(binaanMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const rows: RecapRow[] = [];

  if (period) {
    const { data: submissions } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, total_score, mutabaah_entries(indicator_id, achievement_percentage)")
      .eq("mentor_id", mentorId)
      .eq("period_id", period.id);

    const subByBinaan = new Map();
    (submissions ?? []).forEach((s: any) => {
      subByBinaan.set(s.binaan_id, s);
    });

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

  return {
    period,
    periods,
    indicators,
    rows,
    average: calculatedAvg,
    filledCount: filled.length,
    missingCount: Math.max(0, rows.length - filled.length),
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
  const { data: mentorsRes } = await supabase
    .from("mentors")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  const { data: binaanRes } = await supabase.from("binaan").select("id, mentor_id").eq("status", "active");
  const { data: subs } = await supabase
    .from("mutabaah_submissions")
    .select("mentor_id, period_id, total_score");

  const store = getMasterStore();
  const mentorMap = new Map<string, any>();
  store.mentors.forEach((m) => mentorMap.set(m.name.toLowerCase().trim(), m));
  (mentorsRes ?? []).forEach((m: any) => mentorMap.set(m.name.toLowerCase().trim(), m));
  const mentors = Array.from(mentorMap.values());

  const binaanMap = new Map<string, any>();
  store.binaan.forEach((b) => {
    if (b.status === "active" || !b.status) {
      binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b);
    }
  });
  (binaanRes ?? []).forEach((b: any) => {
    if (b.status === "active" || !b.status) {
      binaanMap.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b);
    }
  });
  const binaan = Array.from(binaanMap.values());

  const submissions = subs ?? [];

  return mentors.map((m: any) => {
    const own = binaan.filter((b: any) => b.mentor_id === m.id);
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

    // Get override specific to mentorId & periodId
    const override = getMentorOverride(m.id, periodId);
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