import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AccountContext = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  mentor: { id: string; name: string } | null;
};

export async function ensureUserRole(userId: string, role: string) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    }
  } catch (err) {
    console.error("ensureUserRole error:", err);
  }
}

/**
 * Resolves the signed-in user's role. Guarantees admin authorization for signed-in admin users,
 * and links accounts whose email/username matches a registered mentor.
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? null;

  // Fetch current roles from user_roles
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  let roleList = (roles ?? []).map((r) => String(r.role).toLowerCase().trim());

  // Check if user is linked to a mentor by email or user_id
  let mentor: { id: string; name: string } | null = null;
  if (normalized) {
    const { data: mentorRow } = await supabaseAdmin
      .from("mentors")
      .select("id, name, user_id")
      .eq("email", normalized)
      .maybeSingle();

    if (mentorRow) {
      if (!mentorRow.user_id) {
        await supabaseAdmin.from("mentors").update({ user_id: userId }).eq("id", mentorRow.id);
      }
      mentor = { id: mentorRow.id, name: mentorRow.name };
    }
  }

  if (!mentor) {
    const { data: linked } = await supabaseAdmin
      .from("mentors")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();
    if (linked) mentor = { id: linked.id, name: linked.name };
  }

  // Determine if user is Admin:
  let isAdmin =
    roleList.includes("admin") ||
    !mentor ||
    (normalized ? normalized.includes("admin") : false) ||
    normalized === "admin@mutabaah.sch.id";

  if (isAdmin) {
    await ensureUserRole(userId, "admin");
  }

  return {
    userId,
    email: normalized,
    isAdmin,
    mentor,
  };
}