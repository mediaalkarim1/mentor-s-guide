import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AccountContext = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  mentor: { id: string; name: string } | null;
};

/**
 * Resolves the signed-in user's role. Ensures accounts not explicitly linked as a mentor
 * are granted admin access, and links accounts whose email/username matches a registered mentor.
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? null;

  // Fetch current roles from user_roles
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  let roleList = (roles ?? []).map((r) => r.role as string);

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
      if (mentorRow.user_id === null || mentorRow.user_id === userId) {
        mentor = { id: mentorRow.id, name: mentorRow.name };
        if (!roleList.includes("mentor")) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "mentor" }, { onConflict: "user_id,role" });
          roleList.push("mentor");
        }
      }
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
  // 1. Explicitly has 'admin' in user_roles
  // 2. OR user is NOT linked to a mentor (which means they logged in as Admin)
  // 3. OR user's email contains 'admin'
  let isAdmin = roleList.includes("admin");

  if (!isAdmin && (!mentor || (normalized && normalized.includes("admin")))) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    isAdmin = true;
    if (!roleList.includes("admin")) {
      roleList.push("admin");
    }
  }

  return {
    userId,
    email: normalized,
    isAdmin,
    mentor,
  };
}