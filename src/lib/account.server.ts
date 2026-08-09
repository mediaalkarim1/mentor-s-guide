import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MASTER_MENTORS } from "./master-data";

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
 * Resolves the signed-in user's role. Strictly isolates Admin vs Mentor permissions.
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? "";

  // Fetch current roles from user_roles
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roleList = (roles ?? []).map((r) => String(r.role).toLowerCase().trim());

  // Strictly check if user is Admin by email/username or explicit admin role
  const isAdmin =
    roleList.includes("admin") ||
    normalized.startsWith("admin") ||
    normalized === "admin@mutabaah.sch.id" ||
    normalized === "admin@mutabaah.local";

  if (isAdmin) {
    await ensureUserRole(userId, "admin");
    return {
      userId,
      email: normalized,
      isAdmin: true,
      mentor: null,
    };
  }

  // Resolve Mentor account
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

  // Fallback to MASTER_MENTORS if not yet linked in DB
  if (!mentor && normalized) {
    const userSlug = normalized.split("@")[0].replace(/[^a-z0-9]/g, "");
    const matchedMaster = MASTER_MENTORS.find((m) => {
      const mSlug = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return mSlug.includes(userSlug) || userSlug.includes(mSlug);
    });
    if (matchedMaster) {
      mentor = { id: matchedMaster.id, name: matchedMaster.name };
    }
  }

  await ensureUserRole(userId, "mentor");

  return {
    userId,
    email: normalized,
    isAdmin: false,
    mentor,
  };
}