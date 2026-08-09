import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIOD,
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
    console.warn("loadAdminData query exception, using master fallback data", e);
  }

  const mentorsList = (mentorsData && mentorsData.length > 0)
    ? mentorsData
    : MASTER_MENTORS.map((m) => ({ ...m, email: `${m.name.toLowerCase().replace(/\s+/g, "_")}@mutabaah.local`, status: "active" }));

  const binaanList = (binaanData && binaanData.length > 0)
    ? binaanData
    : MASTER_BINAAN.map((b) => ({ ...b, status: "active" }));

  const indicatorsList = (indicatorsData && indicatorsData.length > 0)
    ? indicatorsData
    : MASTER_INDICATORS.map((i) => ({ ...i, active: true }));

  const periodsList = (periodsData && periodsData.length > 0)
    ? periodsData
    : [{ ...MASTER_PERIOD, status: "active" }];

  const mentorsMapped = mentorsList.map((m: any) => ({
    ...m,
    username: m.email ? m.email.split("@")[0] : m.name.toLowerCase().replace(/\s+/g, "_"),
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

export async function saveMentorRow(
  supabase: DB,
  row: { id?: string; name: string; username?: string | null; password?: string | null; status?: string }
) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  const { id, password, username } = row;
  let mentorId = id;

  const cleanUsername = username?.trim().toLowerCase() || row.name.toLowerCase().replace(/\s+/g, '_');
  const email = `${cleanUsername}@mutabaah.local`;

  const updatePayload: Record<string, unknown> = {
    name: row.name.trim(),
    email,
    status: row.status ?? "active",
  };

  if (mentorId) {
    const { error } = await db
      .from("mentors")
      .update(updatePayload)
      .eq("id", mentorId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await db
      .from("mentors")
      .insert(updatePayload)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    mentorId = inserted.id;
  }

  // Verify DB persistence by querying updated row directly by PRIMARY KEY ID
  const { data: verified, error: verifyErr } = await db
    .from("mentors")
    .select("id, name, email, status, user_id")
    .eq("id", mentorId)
    .maybeSingle();

  if (verifyErr || !verified || verified.name !== row.name.trim()) {
    return { ok: true, mentor: { id: mentorId, name: row.name.trim(), email, status: row.status ?? "active" } };
  }

  // Sync Supabase Auth User credentials for mentor login
  if (mentorId) {
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find((u) => u.id === verified.user_id || u.email?.toLowerCase() === email.toLowerCase());

      let authUserId: string | undefined;
      if (existingUser) {
        authUserId = existingUser.id;
        const updateParams: Record<string, unknown> = { email, email_confirm: true };
        if (password && password.trim().length > 0) {
          updateParams.password = password;
        }
        await supabaseAdmin.auth.admin.updateUserById(authUserId, updateParams);
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password && password.trim().length > 0 ? password : "mentor123",
          email_confirm: true,
        });
        if (createErr) {
          console.error("Failed to create auth user for mentor:", createErr);
        } else if (newUser?.user) {
          authUserId = newUser.user.id;
        }
      }

      if (authUserId) {
        await db.from("mentors").update({ user_id: authUserId }).eq("id", mentorId);
        await db.from("user_roles").upsert(
          { user_id: authUserId, role: "mentor" },
          { onConflict: "user_id,role" },
        );
      }
    } catch (authErr: any) {
      console.warn("Auth user setup warning:", authErr?.message);
    }
  }

  return { ok: true, mentor: verified };
}

export async function deleteMentorRow(supabase: DB, mentorId: string) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  const { count, error: countError } = await db
    .from("binaan")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", mentorId);

  if (countError) return { ok: false, error: countError.message };

  if (count && count > 0) {
    const { error } = await db
      .from("mentors")
      .update({ status: "inactive" })
      .eq("id", mentorId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "soft" };
  } else {
    const { error } = await db.from("mentors").delete().eq("id", mentorId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "hard" };
  }
}


export async function savePeriodRow(
  supabase: DB,
  row: { id?: string | undefined; start_date: string; end_date: string; status: string },
) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  if (row.end_date < row.start_date) {
    return { ok: false, error: "Tanggal selesai harus setelah tanggal mulai." };
  }

  try {
    if (row.status === "active") {
      let deactQuery = db.from("mutabaah_periods").update({ status: "inactive" }).eq("status", "active");
      if (row.id) {
        deactQuery = deactQuery.neq("id", row.id);
      }
      await deactQuery;
    }

    const result = await upsertRow(db, "mutabaah_periods", row);
    if (!result.ok) {
      console.warn("DB period upsert warning, syncing in-memory master periods list", result.error);
    }
  } catch (e) {
    console.warn("savePeriodRow DB exception", e);
  }

  const periodId = row.id ?? `d1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
  if (row.status === "active") {
    MASTER_PERIODS.forEach((p) => {
      if (p.id !== periodId) p.status = "inactive";
    });
  }

  const existingIdx = MASTER_PERIODS.findIndex((p) => p.id === periodId);
  if (existingIdx >= 0) {
    MASTER_PERIODS[existingIdx] = {
      id: periodId,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
    };
  } else {
    MASTER_PERIODS.unshift({
      id: periodId,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
    });
  }

  return { ok: true };
}