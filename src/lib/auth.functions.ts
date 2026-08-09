import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const mentorLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const loginAdminFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const password = data.password;

    // Check if user exists in Supabase Auth via admin client
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
          return { ok: false, error: "Gagal membuat akun admin: " + (createErr?.message ?? "") };
        }

        existingUser = newUser.user;
      } else {
        // Sync password for existing admin user to match entered password
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
      }

      // Ensure user has admin role in user_roles
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: existingUser.id, role: "admin" },
        { onConflict: "user_id,role" },
      );

      return { ok: true, email };
    } catch (e: any) {
      console.error("loginAdminFn error:", e);
      return { ok: false, error: "Gagal terhubung ke layanan otentikasi." };
    }
  });

export const loginMentorFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => mentorLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const input = data.username.toLowerCase().trim();
    const password = data.password;

    // Find mentor in mentors table by username, email, or name
    const { data: mentors, error: mErr } = await supabaseAdmin
      .from("mentors")
      .select("id, name, username, email, status, user_id");

    if (mErr || !mentors) {
      return { ok: false, error: "Gagal mengakses data mentor." };
    }

    const mentor = mentors.find(
      (m) =>
        (m.username && m.username.toLowerCase() === input) ||
        (m.email && m.email.toLowerCase() === input) ||
        m.name.toLowerCase() === input,
    );

    if (!mentor) {
      return { ok: false, error: "Username atau password salah." };
    }

    if (mentor.status === "inactive") {
      return { ok: false, error: "Akun Mentor sedang tidak aktif. Silakan hubungi Admin." };
    }

    const authEmail = mentor.email?.toLowerCase().trim() || `${mentor.username || input}@mutabaah.local`;

    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === authEmail,
      );

      let authUserId: string;

      if (existingUser) {
        authUserId = existingUser.id;
        // Sync password if user was created or updated by admin
        await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      } else {
        // Create new Auth User for mentor
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true,
        });
        if (createErr || !newUser?.user) {
          console.error("Mentor auth user creation failed:", createErr);
          return { ok: false, error: "Username atau password salah." };
        }
        authUserId = newUser.user.id;
      }

      // Link user_id to mentors table and set mentor role
      await supabaseAdmin.from("mentors").update({ user_id: authUserId }).eq("id", mentor.id);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: authUserId, role: "mentor" },
        { onConflict: "user_id,role" },
      );

      return { ok: true, email: authEmail, mentorId: mentor.id, mentorName: mentor.name };
    } catch (e: any) {
      console.error("loginMentorFn error:", e);
      return { ok: false, error: "Gagal terhubung ke layanan otentikasi." };
    }
  });
