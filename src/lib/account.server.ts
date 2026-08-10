import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AccountContext = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  mentor: { id: string; name: string } | null;
};

export async function ensureUserRole(userId: string, role: "admin" | "mentor") {
  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  }
}

/**
 * Resolves the signed-in user's role strictly from the database:
 * - admin  -> a row in user_roles with role = 'admin'
 * - mentor -> a row in mentors linked by user_id (or by email, then linked)
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? null;

  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roleList = ((roles ?? []) as { role: string }[]).map((r) => String(r.role).toLowerCase());

  if (roleList.includes("admin")) {
    return { userId, email: normalized, isAdmin: true, mentor: null };
  }

  let mentor: { id: string; name: string } | null = null;

  const { data: linked } = await supabaseAdmin
    .from("mentors")
    .select("id, name")
    .eq("user_id", userId)
    .maybeSingle();
  if (linked) mentor = { id: linked.id, name: linked.name };

  if (!mentor && normalized) {
    const { data: byEmail } = await supabaseAdmin
      .from("mentors")
      .select("id, name, user_id")
      .eq("email", normalized)
      .maybeSingle();
    if (byEmail && !byEmail.user_id) {
      await supabaseAdmin.from("mentors").update({ user_id: userId }).eq("id", byEmail.id);
      mentor = { id: byEmail.id, name: byEmail.name };
    } else if (byEmail) {
      mentor = { id: byEmail.id, name: byEmail.name };
    }
  }

  if (mentor && !roleList.includes("mentor")) {
    await ensureUserRole(userId, "mentor");
  }

  return { userId, email: normalized, isAdmin: false, mentor };
}

export async function requireAdmin(userId: string, email: string | null) {
  const account = await resolveAccount(userId, email);
  return account.isAdmin ? account : null;
}
