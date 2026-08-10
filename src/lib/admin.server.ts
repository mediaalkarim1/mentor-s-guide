import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MENTOR_EMAIL_DOMAIN = "mutabaah.local";

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function mentorEmailFor(username: string) {
  return `${slugify(username)}@${MENTOR_EMAIL_DOMAIN}`;
}

export async function loadAdminData() {
  const [mRes, bRes, iRes, pRes] = await Promise.all([
    supabaseAdmin.from("mentors").select("id, name, username, email, status, user_id").order("name"),
    supabaseAdmin.from("binaan").select("id, name, mentor_id, phone, status").order("name"),
    supabaseAdmin
      .from("mutabaah_indicators")
      .select("id, code, name, target, unit, order_number, active")
      .order("order_number"),
    supabaseAdmin
      .from("mutabaah_periods")
      .select("id, start_date, end_date, status")
      .order("start_date", { ascending: false }),
  ]);

  const mentors = ((mRes.data ?? []) as any[]).map((m) => ({
    ...m,
    username: m.username ?? (m.email ? String(m.email).split("@")[0] : slugify(m.name)),
    hasAccount: Boolean(m.user_id),
  }));

  return {
    mentors,
    binaan: bRes.data ?? [],
    indicators: iRes.data ?? [],
    periods: pRes.data ?? [],
  };
}

/* ------------------------------------- Mentors ------------------------------------- */

type MentorInput = {
  id?: string | undefined;
  name: string;
  username?: string | null | undefined;
  email?: string | null | undefined;
  password?: string | null | undefined;
  status?: string | undefined;
};

async function syncMentorAuthUser(mentorId: string, email: string, password?: string | null) {
  const { data: mentor } = await supabaseAdmin
    .from("mentors")
    .select("user_id")
    .eq("id", mentorId)
    .maybeSingle();

  let userId = mentor?.user_id as string | null | undefined;

  if (userId) {
    const payload: any = { email, email_confirm: true };
    if (password) payload["password"] = password;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, payload as any);
    if (error) return { ok: false, error: error.message };
  } else if (password) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created?.user) {
      return { ok: false, error: error?.message ?? "Gagal membuat akun mentor." };
    }
    userId = created.user.id;
    await supabaseAdmin.from("mentors").update({ user_id: userId }).eq("id", mentorId);
  }

  if (userId) {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "mentor")
      .maybeSingle();
    if (!role) await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "mentor" });
  }

  return { ok: true };
}

export async function saveMentorRow(data: MentorInput) {
  const username = slugify(data.username || data.name);
  const email = (data.email && data.email.trim().length > 0 ? data.email.trim().toLowerCase() : mentorEmailFor(username));

  const payload: any = {
    name: data.name.trim(),
    username,
    email,
    status: data.status ?? "active",
  };
  if (data.id) payload["id"] = data.id;

  const { data: saved, error } = await supabaseAdmin
    .from("mentors")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error || !saved) {
    return { ok: false, error: error?.message ?? "Gagal menyimpan mentor." };
  }

  const sync = await syncMentorAuthUser(saved.id, email, data.password ?? null);
  if (!sync.ok) return { ok: false, error: sync.error };

  return { ok: true, id: saved.id, username, email };
}

export async function deleteMentorRow(id: string) {
  const { count } = await supabaseAdmin
    .from("binaan")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", id);

  if (count && count > 0) {
    const { error } = await supabaseAdmin.from("mentors").update({ status: "inactive" }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "soft" as const };
  }

  const { error } = await supabaseAdmin.from("mentors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, mode: "hard" as const };
}

/* -------------------------------------- Binaan ------------------------------------- */

export async function saveBinaanRow(data: {
  id?: string | undefined;
  name: string;
  mentor_id: string;
  phone?: string | null | undefined;
  status?: string | undefined;
}) {
  const payload: any = {
    name: data.name.trim(),
    mentor_id: data.mentor_id,
    phone: data.phone ?? null,
    status: data.status ?? "active",
  };
  if (data.id) payload["id"] = data.id;

  const { error } = await supabaseAdmin.from("binaan").upsert(payload, { onConflict: "id" });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Nama binaan ini sudah terdaftar pada mentor tersebut." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteBinaanRow(id: string) {
  const { count } = await supabaseAdmin
    .from("mutabaah_submissions")
    .select("id", { count: "exact", head: true })
    .eq("binaan_id", id);

  if (count && count > 0) {
    const { error } = await supabaseAdmin.from("binaan").update({ status: "inactive" }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "soft" as const };
  }

  const { error } = await supabaseAdmin.from("binaan").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, mode: "hard" as const };
}

export async function restoreBinaanRow(data: { id: string; mentor_id?: string | undefined }) {
  const payload: any = { status: "active" };
  if (data.mentor_id) payload["mentor_id"] = data.mentor_id;
  const { error } = await supabaseAdmin.from("binaan").update(payload).eq("id", data.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ------------------------------------ Indicators ----------------------------------- */

export async function saveIndicatorRow(data: {
  id?: string | undefined;
  code: string;
  name: string;
  target: number;
  unit: string;
  order_number: number;
  active: boolean;
}) {
  const payload: any = {
    code: data.code.trim(),
    name: data.name.trim(),
    target: data.target,
    unit: data.unit.trim(),
    order_number: data.order_number,
    active: data.active,
  };
  if (data.id) payload["id"] = data.id;

  const { error } = await supabaseAdmin.from("mutabaah_indicators").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteIndicatorRow(id: string) {
  const { error } = await supabaseAdmin.from("mutabaah_indicators").update({ active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* -------------------------------------- Periods ------------------------------------ */

export async function savePeriodRow(data: {
  id?: string | undefined;
  start_date: string;
  end_date: string;
  status: string;
}) {
  const payload: any = {
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
  };
  if (data.id) payload["id"] = data.id;

  const { data: saved, error } = await supabaseAdmin
    .from("mutabaah_periods")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error || !saved) return { ok: false, error: error?.message ?? "Gagal menyimpan periode." };

  if (data.status === "active") {
    await supabaseAdmin.from("mutabaah_periods").update({ status: "closed" }).neq("id", saved.id);
  }

  return { ok: true, id: saved.id };
}
