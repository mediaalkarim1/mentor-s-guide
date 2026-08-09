import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const mentorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().min(2).max(50).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  password: z.string().trim().min(4).max(72).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const binaanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  mentor_id: z.string().uuid(),
  phone: z.string().trim().max(30).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const indicatorSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(2).max(100),
  target: z.number().positive().max(1000),
  unit: z.string().trim().min(1).max(20),
  order_number: z.number().int().min(1).max(99),
  active: z.boolean().default(true),
});

const periodSchema = z.object({
  id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["active", "closed"]).default("closed"),
});

export const getAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadAdminData } = await import("./admin.server");
    return loadAdminData(context.supabase);
  });

export const saveMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => mentorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveMentorRow } = await import("./admin.server");
    return saveMentorRow(context.supabase, data);
  });

export const deleteMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteMentorRow } = await import("./admin.server");
    return deleteMentorRow(context.supabase, data.id);
  });

export const saveBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => binaanSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { upsertRow } = await import("./admin.server");
    return upsertRow(context.supabase, "binaan", data);
  });

export const deleteBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteBinaanRow } = await import("./admin.server");
    return deleteBinaanRow(context.supabase, data.id);
  });

export const restoreBinaan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), mentor_id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { restoreBinaanRow } = await import("./admin.server");
    return restoreBinaanRow(context.supabase, data);
  });

export const saveIndicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => indicatorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { upsertRow } = await import("./admin.server");
    return upsertRow(context.supabase, "mutabaah_indicators", data);
  });

export const savePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { savePeriodRow } = await import("./admin.server");
    return savePeriodRow(context.supabase, data);
  });