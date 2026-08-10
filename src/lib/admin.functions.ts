import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const mentorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().min(2).max(50).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  password: z.string().trim().min(4).max(72).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const binaanSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  mentor_id: z.string(),
  phone: z.string().trim().max(30).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const indicatorSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(100),
  target: z.number().positive().max(1000),
  unit: z.string().trim().min(1).max(20),
  order_number: z.number().int().min(1).max(99),
  active: z.boolean().default(true),
});

const periodSchema = z.object({
  id: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(["active", "inactive", "closed"]).default("closed"),
});

const DENIED = { ok: false as const, error: "Akses ditolak. Hanya Admin yang dapat melakukan aksi ini." };

async function assertAdmin(context: { userId: string; claims: unknown }) {
  const { requireAdmin } = await import("./account.server");
  const email = (context.claims as { email?: string }).email ?? null;
  return requireAdmin(context.userId, email);
}

export const getAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAccount } = await import("./account.server");
    const { loadAdminData } = await import("./admin.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const account = await resolveAccount(context.userId, email);

    if (!account.isAdmin) {
      // Mentors only get the mentor name list for labels — no admin-only data.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: mentors } = await supabaseAdmin
        .from("mentors")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      return { account, mentors: mentors ?? [], binaan: [], indicators: [], periods: [] };
    }

    const data = await loadAdminData();
    return { account, ...data };
  });

export const saveMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => mentorSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { saveMentorRow } = await import("./admin.server");
    return saveMentorRow(data);
  });

export const deleteMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { deleteMentorRow } = await import("./admin.server");
    return deleteMentorRow(data.id);
  });

export const saveBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => binaanSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { saveBinaanRow } = await import("./admin.server");
    return saveBinaanRow(data);
  });

export const deleteBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { deleteBinaanRow } = await import("./admin.server");
    return deleteBinaanRow(data.id);
  });

export const restoreBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string(), mentor_id: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { restoreBinaanRow } = await import("./admin.server");
    return restoreBinaanRow(data);
  });

export const saveIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => indicatorSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { saveIndicatorRow } = await import("./admin.server");
    return saveIndicatorRow(data);
  });

export const deleteIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { deleteIndicatorRow } = await import("./admin.server");
    return deleteIndicatorRow(data.id);
  });

export const savePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context))) return DENIED;
    const { savePeriodRow } = await import("./admin.server");
    return savePeriodRow(data);
  });
