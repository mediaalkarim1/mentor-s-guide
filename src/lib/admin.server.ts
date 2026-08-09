import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIODS,
} from "./master-data";

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

  // Merge DB data with in-memory MASTER data seamlessly
  const mentorMap = new Map<string, any>();
  MASTER_MENTORS.forEach((m) => {
    mentorMap.set(m.id, {
      ...m,
      email: (m as any).email ?? `${m.name.toLowerCase().replace(/\s+/g, "_")}@mutabaah.local`,
      status: (m as any).status ?? "active",
    });
  });
  mentorsData.forEach((m) => mentorMap.set(m.id, m));
  const mentorsList = Array.from(mentorMap.values());

  const binaanMap = new Map<string, any>();
  MASTER_BINAAN.forEach((b) => {
    binaanMap.set(b.id, { ...b, status: (b as any).status ?? "active" });
  });
  binaanData.forEach((b) => binaanMap.set(b.id, b));
  const binaanList = Array.from(binaanMap.values());

  const indicatorMap = new Map<string, any>();
  MASTER_INDICATORS.forEach((i) => {
    indicatorMap.set(i.id, { ...i, active: (i as any).active ?? true });
  });
  indicatorsData.forEach((i) => indicatorMap.set(i.id, i));
  const indicatorsList = Array.from(indicatorMap.values()).sort((a, b) => a.order_number - b.order_number);

  const periodMap = new Map<string, any>();
  MASTER_PERIODS.forEach((p) => {
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

  // Update in-memory master data arrays seamlessly
  if (table === "binaan") {
    const bId = id ?? `b1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    const idx = MASTER_BINAAN.findIndex((b) => b.id === bId);
    const item = {
      id: bId,
      name: String(row.name),
      mentor_id: String(row.mentor_id),
      phone: row.phone ? String(row.phone) : undefined,
      status: String(row.status ?? "active"),
    };
    if (idx >= 0) {
      MASTER_BINAAN[idx] = { ...MASTER_BINAAN[idx], ...item };
    } else {
      MASTER_BINAAN.unshift(item);
    }
  } else if (table === "mutabaah_indicators") {
    const iId = id ?? `c1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    const idx = MASTER_INDICATORS.findIndex((i) => i.id === iId);
    const item = {
      id: iId,
      code: String(row.code),
      name: String(row.name),
      target: Number(row.target),
      unit: String(row.unit),
      order_number: Number(row.order_number),
      active: Boolean(row.active ?? true),
    };
    if (idx >= 0) {
      MASTER_INDICATORS[idx] = { ...MASTER_INDICATORS[idx], ...item };
    } else {
      MASTER_INDICATORS.push(item);
      MASTER_INDICATORS.sort((a, b) => a.order_number - b.order_number);
    }
  } else if (table === "mutabaah_periods") {
    const pId = id ?? `d1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    if (row.status === "active") {
      MASTER_PERIODS.forEach((p) => {
        if (p.id !== pId) p.status = "inactive";
      });
    }
    const idx = MASTER_PERIODS.findIndex((p) => p.id === pId);
    const item = {
      id: pId,
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      status: String(row.status),
    };
    if (idx >= 0) {
      MASTER_PERIODS[idx] = item;
    } else {
      MASTER_PERIODS.unshift(item);
    }
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

  const idx = MASTER_BINAAN.findIndex((b) => b.id === binaanId);
  if (idx >= 0) {
    MASTER_BINAAN.splice(idx, 1);
  }
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

  const idx = MASTER_BINAAN.findIndex((b) => b.id === row.id);
  if (idx >= 0) {
    MASTER_BINAAN[idx].status = "active";
    if (row.mentor_id) MASTER_BINAAN[idx].mentor_id = row.mentor_id;
  }
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

  // Update in-memory MASTER_MENTORS list
  const idx = MASTER_MENTORS.findIndex((m) => m.id === mentorId);
  const mItem = {
    id: mentorId,
    name: row.name.trim(),
    email,
    username: cleanUsername,
    status: row.status ?? "active",
  };
  if (idx >= 0) {
    MASTER_MENTORS[idx] = { ...MASTER_MENTORS[idx], ...mItem };
  } else {
    MASTER_MENTORS.push(mItem);
  }

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

  const idx = MASTER_MENTORS.findIndex((m) => m.id === mentorId);
  if (idx >= 0) {
    MASTER_MENTORS.splice(idx, 1);
  }
  return { ok: true, mode: "hard" };
}

export async function savePeriodRow(
  supabase: DB,
  row: { id?: string | undefined; start_date: string; end_date: string; status: string },
) {
  return upsertRow(supabase, "mutabaah_periods", row);
}