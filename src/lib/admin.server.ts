import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMasterStore, updateMasterStore } from "./master_overrides.server";

type DB = SupabaseClient<any, "public", any>;

export async function loadAdminData(supabase: DB) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  let mentorsData: any[] = [];
  let binaanData: any[] = [];
  let indicatorsData: any[] = [];
  let periodsData: any[] = [];

  try {
    const [mRes, bRes, iRes, pRes] = await Promise.all([
      db.from("mentors").select("id, name, email, status").order("name"),
      db.from("binaan").select("id, name, mentor_id, phone, status").order("name"),
      db.from("mutabaah_indicators").select("id, code, name, target, unit, order_number, active").order("order_number"),
      db.from("mutabaah_periods").select("id, start_date, end_date, status").order("start_date", { ascending: false }),
    ]);
    mentorsData = mRes.data ?? [];
    binaanData = bRes.data ?? [];
    indicatorsData = iRes.data ?? [];
    periodsData = pRes.data ?? [];
  } catch (e) {
    console.warn("loadAdminData query exception", e);
  }

  const store = getMasterStore();

  // Merge DB data with persistent master store seamlessly using normalized entity keys
  const mentorMap = new Map<string, any>();
  store.mentors.forEach((m) => {
    const key = (m.name || "").toLowerCase().trim();
    mentorMap.set(key, {
      ...m,
      email: m.email ?? `${m.name.toLowerCase().replace(/\s+/g, "_")}@mutabaah.local`,
      status: m.status ?? "active",
    });
  });
  mentorsData.forEach((m) => {
    const key = (m.name || "").toLowerCase().trim();
    mentorMap.set(key, m);
  });
  const mentorsList = Array.from(mentorMap.values());

  const binaanMap = new Map<string, any>();
  store.binaan.forEach((b) => {
    const key = `${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`;
    binaanMap.set(key, { ...b, status: b.status ?? "active" });
  });
  binaanData.forEach((b) => {
    const key = `${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`;
    binaanMap.set(key, b);
  });
  const binaanList = Array.from(binaanMap.values());

  const indicatorMap = new Map<string, any>();
  store.indicators.forEach((i) => {
    const key = (i.code || "").toUpperCase().trim();
    indicatorMap.set(key, { ...i, active: i.active ?? true });
  });
  indicatorsData.forEach((i) => {
    const key = (i.code || "").toUpperCase().trim();
    indicatorMap.set(key, i);
  });
  const indicatorsList = Array.from(indicatorMap.values()).sort((a, b) => (a.order_number || 0) - (b.order_number || 0));

  const periodMap = new Map<string, any>();
  store.periods.forEach((p) => {
    const key = `${p.start_date}::${p.end_date}`;
    periodMap.set(key, p);
  });
  periodsData.forEach((p) => {
    const key = `${p.start_date}::${p.end_date}`;
    periodMap.set(key, p);
  });
  const periodsList = Array.from(periodMap.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));

  const mentorsMapped = mentorsList.map((m: any) => ({
    ...m,
    username: m.username ?? (m.email ? m.email.split("@")[0] : m.name.toLowerCase().replace(/\s+/g, "_")),
  }));

  return {
    mentors: mentorsMapped,
    binaan: binaanList,
    indicators: indicatorsList,
    periods: periodsList,
  };
}

export async function saveMentorRow(supabase: DB, data: { id?: string; name: string; username?: string; status?: string }) {
  updateMasterStore("mentors", "upsert", data);
  try {
    const email = `${data.name.toLowerCase().replace(/\s+/g, "_")}@mutabaah.local`;
    const payload: any = { name: data.name, email, status: data.status ?? "active" };
    if (data.id) payload.id = data.id;
    await supabaseAdmin.from("mentors").upsert(payload, { onConflict: "id" });
  } catch (e) {
    console.warn("saveMentorRow DB write notice", e);
  }
  return { ok: true };
}

export async function deleteMentorRow(supabase: DB, id: string) {
  updateMasterStore("mentors", "delete", { id });
  try {
    const { count } = await supabaseAdmin.from("binaan").select("id", { count: "exact", head: true }).eq("mentor_id", id);
    if (count && count > 0) {
      await supabaseAdmin.from("mentors").update({ status: "inactive" }).eq("id", id);
      return { ok: true, mode: "soft" };
    }
    await supabaseAdmin.from("mentors").delete().eq("id", id);
  } catch (e) {
    console.warn("deleteMentorRow DB write notice", e);
  }
  return { ok: true, mode: "hard" };
}

export async function deleteBinaanRow(supabase: DB, id: string) {
  updateMasterStore("binaan", "delete", { id });
  try {
    const { count } = await supabaseAdmin.from("mutabaah_submissions").select("id", { count: "exact", head: true }).eq("binaan_id", id);
    if (count && count > 0) {
      await supabaseAdmin.from("binaan").update({ status: "inactive" }).eq("id", id);
      return { ok: true, mode: "soft" };
    }
    await supabaseAdmin.from("binaan").delete().eq("id", id);
  } catch (e) {
    console.warn("deleteBinaanRow DB write notice", e);
  }
  return { ok: true, mode: "hard" };
}

export async function savePeriodRow(supabase: DB, data: { id?: string; start_date: string; end_date: string; status: string }) {
  updateMasterStore("periods", data.status === "active" ? "activate" : "upsert", data);
  try {
    if (data.status === "active") {
      await supabaseAdmin.from("mutabaah_periods").update({ status: "closed" }).neq("id", data.id ?? "");
    }
    const payload: any = { start_date: data.start_date, end_date: data.end_date, status: data.status };
    if (data.id) payload.id = data.id;
    await supabaseAdmin.from("mutabaah_periods").upsert(payload, { onConflict: "id" });
  } catch (e) {
    console.warn("savePeriodRow DB write notice", e);
  }
  return { ok: true };
}

export async function upsertRow(supabase: DB, table: string, row: Record<string, any>) {
  updateMasterStore(table as any, "upsert", row);
  try {
    await supabaseAdmin.from(table).upsert(row, { onConflict: "id" });
  } catch (e) {
    console.warn(`upsertRow ${table} DB write notice`, e);
  }
  return { ok: true };
}