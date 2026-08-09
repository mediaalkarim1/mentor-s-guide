import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitSchema = z.object({
  binaanId: z.string().uuid(),
  mentorId: z.string().uuid(),
  entries: z
    .array(z.object({ indicatorId: z.string().uuid(), realization: z.number().min(0).max(1000) }))
    .min(1),
});

export const getPublicFormData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPublicFormData } = await import("./mutabaah.server");
  return loadPublicFormData();
});

export const submitMutabaah = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const { submitMutabaahRecord } = await import("./mutabaah.server");
    return submitMutabaahRecord(data);
  });