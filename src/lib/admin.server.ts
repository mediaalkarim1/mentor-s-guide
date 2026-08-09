import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient<any, "public", any>;

export async function loadAdminData(supabase: DB) {
  const [mentors, binaan, indicators, periods] = await Promise.all([
    supabase.from("mentors").select("id, name, email, status").order("name"),
    supabase.from("binaan").select("id, name, mentor_id, phone, status, deleted_at").order("name"),
    supabase
      .from("mutabaah_indicators")
      .select("id, code, name, target, unit, order_number, active")
      .order("order_number"),
    supabase
      .from("mutabaah_periods")
      .select("id, start_date, end_date, status")
      .order("start_date", { ascending: false }),
  ]);

  return {
    mentors: mentors.data ?? [],
    binaan: binaan.data ?? [],
    indicators: indicators.data ?? [],
    periods: periods.data ?? [],
  };
}

export async function upsertRow(supabase: DB, table: string, row: Record<string, unknown>) {
  const { id, ...values } = row as { id?: string };
  if (id) {
    const { error } = await supabase.from(table).update(values).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase.from(table).insert(values);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteBinaanRow(supabase: DB, binaanId: string) {
  const { count, error: countError } = await supabase
    .from("mutabaah_submissions")
    .select("id", { count: "exact", head: true })
    .eq("binaan_id", binaanId);

  if (countError) return { ok: false, error: countError.message };

  if (count && count > 0) {
    const { error } = await supabase
      .from("binaan")
      .update({ status: "inactive", deleted_at: new Date().toISOString() })
      .eq("id", binaanId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "soft" };
  } else {
    const { error } = await supabase.from("binaan").delete().eq("id", binaanId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "hard" };
  }
}

export async function restoreBinaanRow(
  supabase: DB,
  row: { id: string; mentor_id?: string },
) {
  const updates: Record<string, unknown> = {
    status: "active",
    deleted_at: null,
  };
  if (row.mentor_id) {
    updates.mentor_id = row.mentor_id;
  }
  const { error } = await supabase.from("binaan").update(updates).eq("id", row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function savePeriodRow(
  supabase: DB,
  row: { id?: string | undefined; start_date: string; end_date: string; status: string },
) {
  if (row.end_date < row.start_date) {
    return { ok: false, error: "Tanggal selesai harus setelah tanggal mulai." };
  }
  const result = await upsertRow(supabase, "mutabaah_periods", row);
  if (!result.ok) return result;

  if (row.status === "active") {
    let query = supabase.from("mutabaah_periods").update({ status: "closed" }).eq("status", "active");
    const { data: current } = await supabase
      .from("mutabaah_periods")
      .select("id")
      .eq("start_date", row.start_date)
      .eq("end_date", row.end_date)
      .maybeSingle();
    if (current?.id) query = query.neq("id", current.id);
    await query;
  }
  return { ok: true };
}