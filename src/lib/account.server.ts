import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AccountContext = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  mentor: { id: string; name: string } | null;
};

/**
 * Resolves the signed-in user's role. Bootstraps the very first account as admin,
 * and links accounts whose email matches a registered mentor.
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? null;

  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  let roleList = (roles ?? []).map((r) => r.role as string);

  if (roleList.length === 0) {
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
      roleList = ["admin"];
    }
  }

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

  return {
    userId,
    email: normalized,
    isAdmin: roleList.includes("admin"),
    mentor,
  };
}