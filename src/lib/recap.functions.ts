import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const periodInput = z.object({
  periodId: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
});

export const getMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAccount } = await import("./account.server");
    const email = (context.claims as { email?: string }).email ?? null;
    return resolveAccount(context.userId, email);
  });

export const getMentorRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    periodInput.extend({ mentorId: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const { buildMentorRecap } = await import("./recap.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    const mentorId = account.isAdmin && data.mentorId ? data.mentorId : account.mentor?.id;
    if (!mentorId) {
      return { account, recap: null as null | Awaited<ReturnType<typeof buildMentorRecap>> };
    }
    const recap = await buildMentorRecap(context.supabase, mentorId, data.periodId);
    return { account, recap };
  });

export const getBinaanDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    periodInput.extend({ binaanId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { buildBinaanDetail } = await import("./recap.server");
    return buildBinaanDetail(context.supabase, data.binaanId, data.periodId);
  });

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => periodInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    // Security Authorization Guard: Non-admin Mentors CANNOT access Admin Dashboard
    if (!account.isAdmin) {
      return {
        ok: false,
        unauthorized: true,
        account,
        periods: [],
        period: null,
        summaries: [],
        stats: { mentors: 0, binaan: 0, filled: 0, missing: 0, average: 0 },
      };
    }

    const { listPeriods, resolvePeriod, buildMentorSummaries } = await import("./recap.server");
    const { averageScore, monthLabel } = await import("./mutabaah-config");

    const client = supabaseAdmin;
    const periods = await listPeriods(client);
    const period = await resolvePeriod(client, data.periodId);
    const monthIds = period
      ? periods.filter((p) => monthLabel(p.start_date) === monthLabel(period.start_date)).map((p) => p.id)
      : [];

    const summaries = await buildMentorSummaries(client, period?.id ?? null, monthIds);
    const { count: binaanCount } = await client
      .from("binaan")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const filled = summaries.reduce((a, s) => a + s.filled, 0);
    const masterBinaanTotal = summaries.reduce((a, s) => a + s.binaanCount, 0);
    const totalBinaan = (binaanCount && binaanCount > 0) ? binaanCount : (masterBinaanTotal > 0 ? masterBinaanTotal : 85);
    const scored = summaries.filter((s) => s.filled > 0);

    return {
      ok: true,
      account,
      periods,
      period,
      summaries,
      stats: {
        mentors: summaries.length > 0 ? summaries.length : 13,
        binaan: totalBinaan,
        filled,
        missing: Math.max(0, totalBinaan - filled),
        average: scored.length > 0 ? averageScore(scored.map((s) => s.weeklyScore)) : 0,
      },
    };
  });

export const getMentorHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ mentorId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { buildMentorHistory } = await import("./recap.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return buildMentorHistory(supabaseAdmin, data.mentorId);
  });

export const getMonthlyRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ month: z.string().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const { listPeriods, buildMentorSummaries } = await import("./recap.server");
    const { monthLabel, averageScore } = await import("./mutabaah-config");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    const periods = await listPeriods(context.supabase);
    const months = Array.from(new Set(periods.map((p) => monthLabel(p.start_date))));
    const month = data.month && months.includes(data.month) ? data.month : (months[0] ?? null);
    const monthPeriods = periods
      .filter((p) => month && monthLabel(p.start_date) === month)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const summaries = await buildMentorSummaries(
      context.supabase,
      null,
      monthPeriods.map((p) => p.id),
    );

    const { data: subs } = await context.supabase
      .from("mutabaah_submissions")
      .select("mentor_id, period_id, total_score");

    const rows = summaries
      .filter((s) => account.isAdmin || s.mentorId === account.mentor?.id)
      .map((s) => {
        const weekly = monthPeriods.map((p) => {
          const list = (subs ?? []).filter(
            (x: any) => x.mentor_id === s.mentorId && x.period_id === p.id,
          );
          return list.length ? averageScore(list.map((x: any) => Number(x.total_score))) : null;
        });
        return {
          mentorId: s.mentorId,
          mentorName: s.mentorName,
          weekly,
          monthly: averageScore(weekly.filter((v): v is number => v !== null)),
        };
      });

    return { months, month, periods: monthPeriods, rows, isAdmin: account.isAdmin };
  });

export const getBinaanMonthlyRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ month: z.string().optional(), mentorId: z.string().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const { buildBinaanMonthlyRecap } = await import("./recap.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    // Strict Mentor Data Isolation:
    const mentorId = account.isAdmin && data.mentorId ? data.mentorId : account.mentor?.id;
    if (!mentorId) {
      return { months: [], month: "", periods: [], rows: [], mentorName: "-", isAdmin: account.isAdmin };
    }

    const recap = await buildBinaanMonthlyRecap(context.supabase, mentorId, data.month);
    return { ...recap, isAdmin: account.isAdmin };
  });

export const getSingleBinaanMonthlyDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ binaanId: z.string(), month: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { buildSingleBinaanMonthlyDetail } = await import("./recap.server");
    return buildSingleBinaanMonthlyDetail(context.supabase, data.binaanId, data.month);
  });

export const getExportRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => periodInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { buildExportRows } = await import("./recap.server");
    return buildExportRows(context.supabase, data.periodId);
  });

const saveOverrideSchema = z.object({
  mentorId: z.string(),
  periodId: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
  isOverride: z.boolean(),
  manualWeeklyScore: z.number().optional(),
  manualMonthlyScore: z.number().optional(),
  manualStatus: z.string().optional(),
});

export const saveMentorRecapOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveOverrideSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    if (!account.isAdmin) {
      return { ok: false, error: "Akses ditolak. Hanya Admin yang dapat mengubah rekap." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolvePeriod, setMentorOverrideRow } = await import("./recap.server");
    const period = await resolvePeriod(supabaseAdmin, data.periodId);
    if (!period) {
      return { ok: false, error: "Periode tidak ditemukan." };
    }

    return setMentorOverrideRow(supabaseAdmin, {
      mentorId: data.mentorId,
      periodId: period.id,
      isOverride: data.isOverride,
      ...(data.manualWeeklyScore !== undefined ? { manualWeeklyScore: data.manualWeeklyScore } : {}),
      ...(data.manualMonthlyScore !== undefined ? { manualMonthlyScore: data.manualMonthlyScore } : {}),
      ...(data.manualStatus !== undefined ? { manualStatus: data.manualStatus } : {}),
    });
  });

const resetRecapSchema = z.object({
  mentorId: z.string(),
  scope: z.enum(["weekly", "monthly", "all"]),
  periodId: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : undefined)),
});

export const resetMentorRecap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetRecapSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveAccount } = await import("./account.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    if (!account.isAdmin) {
      return { ok: false, error: "Akses ditolak. Hanya Admin yang dapat melakukan reset rekap." };
    }

    const { listPeriods, resolvePeriod, resetMentorRecapServer } = await import("./recap.server");
    const { monthLabel } = await import("./mutabaah-config");

    const client = supabaseAdmin;
    const periods = await listPeriods(client);
    const period = await resolvePeriod(client, data.periodId);
    const monthIds = period
      ? periods.filter((p) => monthLabel(p.start_date) === monthLabel(period.start_date)).map((p) => p.id)
      : [];

    return resetMentorRecapServer(client, data.mentorId, data.scope, period?.id ?? null, monthIds);
  });