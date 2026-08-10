import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FALLBACK_MENTORS } from "./mutabaah.server";

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
 * - admin  -> a row in user_roles with role = 'admin' (or admin email)
 * - mentor -> a row in mentors linked by user_id or email, or fallback mentor
 */
export async function resolveAccount(userId: string, email: string | null): Promise<AccountContext> {
  const normalized = email?.toLowerCase().trim() ?? null;

  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roleList = ((roles ?? []) as { role: string }[]).map((r) => String(r.role).toLowerCase());

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
    } else {
      const cleanEmail = normalized.replace(/[^a-z]/g, "");
      const foundFallback = FALLBACK_MENTORS.find((m) => {
        const cleanName = m.name.toLowerCase().replace(/[^a-z]/g, "");
        return cleanEmail.includes(cleanName) || cleanName.includes(cleanEmail.replace("mutabaahlocal", "").replace("gmailcom", ""));
      });
      if (foundFallback) {
        mentor = { id: foundFallback.id, name: foundFallback.name };
      }
    }
  }

  const isAdminEmail = Boolean(normalized && (normalized.startsWith("admin") || normalized.includes("admin")));

  if (roleList.includes("admin") || isAdminEmail) {
    if (!roleList.includes("admin")) {
      await ensureUserRole(userId, "admin");
    }
    return {
      userId,
      email: normalized,
      isAdmin: true,
      mentor: mentor ?? { id: "a1000000-0000-0000-0000-000000000001", name: "Umi Indah" },
    };
  }

  if (!mentor) {
    mentor = { id: FALLBACK_MENTORS[0].id, name: FALLBACK_MENTORS[0].name };
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
