import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const adminLoginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

const mentorLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const loginAdminFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminLoginSchema.parse(data))
  .handler(async ({ data }) => {
    let email = data.email.toLowerCase().trim();
    if (!email.includes("@")) {
      email = `${email}@mutabaah.sch.id`;
    }
    const password = data.password;

    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      let existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );

      if (!existingUser) {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createErr || !newUser?.user) {
          return { ok: false, error: "Username atau password salah." };
        }

        existingUser = newUser.user;
      }

      const { ensureUserRole } = await import("./account.server");
      await ensureUserRole(existingUser.id, "admin");

      return { ok: true, email };
    } catch (e: any) {
      console.error("loginAdminFn error:", e);
      return { ok: false, error: "Username atau password salah." };
    }
  });

export const loginMentorFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => mentorLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const input = data.username.toLowerCase().trim();

    const { data: mentors, error: mErr } = await supabaseAdmin
      .from("mentors")
      .select("id, name, email, status, user_id");

    if (mErr || !mentors) {
      console.error("loginMentorFn mentors query error:", mErr);
      return { ok: false, error: "Username atau password salah." };
    }

    const mentor = mentors.find(
      (m) =>
        (m.email && m.email.toLowerCase() === input) ||
        (m.email && m.email.split("@")[0].toLowerCase() === input) ||
        m.name.toLowerCase() === input ||
        m.name.toLowerCase().replace(/\s+/g, "_") === input,
    );

    if (!mentor) {
      return { ok: false, error: "Username atau password salah." };
    }

    if (mentor.status === "inactive") {
      return { ok: false, error: "Akun Mentor sedang tidak aktif. Silakan hubungi Admin." };
    }

    const authEmail = mentor.email?.toLowerCase().trim() || `${input}@mutabaah.local`;

    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === authEmail,
      );

      let authUserId: string;

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password: data.password || "mentor123",
          email_confirm: true,
        });
        if (createErr || !newUser?.user) {
          console.error("Mentor auth user creation failed:", createErr);
          return { ok: false, error: "Username atau password salah." };
        }
        authUserId = newUser.user.id;
      }

      await supabaseAdmin.from("mentors").update({ user_id: authUserId }).eq("id", mentor.id);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: authUserId, role: "mentor" },
        { onConflict: "user_id,role" },
      );

      return { ok: true, email: authEmail, mentorId: mentor.id, mentorName: mentor.name };
    } catch (e: any) {
      console.error("loginMentorFn error:", e);
      return { ok: false, error: "Username atau password salah." };
    }
  });
