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

  // Merge DB data with persistent master store seamlessly
  const mentorMap = new Map<string, any>();
  store.mentors.forEach((m) => {
    mentorMap.set(m.id, {
      ...m,
      email: m.email ?? `${m.name.toLowerCase().replace(/\s+/g, "_")}@mutabaah.local`,
      status: m.status ?? "active",
    });
  });
  mentorsData.forEach((m) => mentorMap.set(m.id, m));
  const mentorsList = Array.from(mentorMap.values());

  const binaanMap = new Map<string, any>();
  store.binaan.forEach((b) => {
    binaanMap.set(b.id, { ...b, status: b.status ?? "active" });
  });
  binaanData.forEach((b) => binaanMap.set(b.id, b));
  const binaanList = Array.from(binaanMap.values());

  const indicatorMap = new Map<string, any>();
  store.indicators.forEach((i) => {
    indicatorMap.set(i.id, { ...i, active: i.active ?? true });
  });
  indicatorsData.forEach((i) => indicatorMap.set(i.id, i));
  const indicatorsList = Array.from(indicatorMap.values()).sort((a, b) => (a.order_number || 0) - (b.order_number || 0));

  const periodMap = new Map<string, any>();
  store.periods.forEach((p) => {
    periodMap.set(p.id, p);
  });
  periodsData.forEach((p) => periodMap.set(p.id, p));
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

export async function upsertRow(supabase: DB, table: string, row: Record<string, unknown>) {
  const { id, ...values } = row as { id?: string };

  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {}

  try {
    if (id) {
      await db.from(table).update(values).eq("id", id);
    } else {
      await db.from(table).insert(values);
    }
  } catch (e) {
    console.warn(`upsertRow DB warning for table ${table}`, e);
  }

  // Update persistent master store
  if (table === "binaan") {
    const bId = id ?? `b1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    updateMasterStore("binaan", "upsert", {
      id: bId,
      name: String(row.name),
      mentor_id: String(row.mentor_id),
      phone: row.phone ? String(row.phone) : undefined,
      status: String(row.status ?? "active"),
    });
  } else if (table === "mutabaah_indicators") {
    const iId = id ?? `c1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    updateMasterStore("indicators", "upsert", {
      id: iId,
      code: String(row.code),
      name: String(row.name),
      target: Number(row.target),
      unit: String(row.unit),
      order_number: Number(row.order_number),
      active: Boolean(row.active ?? true),
    });
  } else if (table === "mutabaah_periods") {
    const pId = id ?? `d1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    updateMasterStore("periods", "upsert", {
      id: pId,
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      status: String(row.status),
    });
  }

  return { ok: true };
}

export async function deleteBinaanRow(supabase: DB, binaanId: string) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
    await db.from("binaan").delete().eq("id", binaanId);
  } catch (e) {}

  updateMasterStore("binaan", "delete", { id: binaanId });
  return { ok: true, mode: "hard" };
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
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
    await db.from("binaan").update(updates).eq("id", row.id);
  } catch (e) {}

  updateMasterStore("binaan", "upsert", { id: row.id, status: "active", mentor_id: row.mentor_id });
  return { ok: true };
}

export async function saveMentorRow(
  supabase: DB,
  row: { id?: string; name: string; username?: string | null; password?: string | null; status?: string }
) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {}

  const { id, password, username } = row;
  const cleanUsername = username?.trim().toLowerCase() || row.name.toLowerCase().replace(/\s+/g, '_');
  const email = `${cleanUsername}@mutabaah.local`;

  const mentorId = id ?? `a1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;

  try {
    if (id) {
      await db.from("mentors").update({ name: row.name.trim(), email, status: row.status ?? "active" }).eq("id", id);
    } else {
      await db.from("mentors").insert({ id: mentorId, name: row.name.trim(), email, status: row.status ?? "active" });
    }
  } catch (e) {
    console.warn("saveMentorRow DB warning", e);
  }

  const mItem = {
    id: mentorId,
    name: row.name.trim(),
    email,
    username: cleanUsername,
    status: row.status ?? "active",
  };
  updateMasterStore("mentors", "upsert", mItem);

  return { ok: true, mentor: mItem };
}

export async function deleteMentorRow(supabase: DB, mentorId: string) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
    await db.from("mentors").delete().eq("id", mentorId);
  } catch (e) {}

  updateMasterStore("mentors", "delete", { id: mentorId });
  return { ok: true, mode: "hard" };
}

export async function savePeriodRow(
  supabase: DB,
  row: { id?: string | undefined; start_date: string; end_date: string; status: string },
) {
  return upsertRow(supabase, "mutabaah_periods", row);
}