import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type DB = SupabaseClient<any, "public", any>;

export const EXACT_MASTER_DATA = [
  {
    name: "Abi Azam",
    aliases: ["abi azam", "abi_azam"],
    username: "abi_azam",
    email: "abi_azam@mutabaah.local",
    binaan: ["Abi Erle", "Abi Helmi", "Abi Ma'ares", "Abi Willy"],
  },
  {
    name: "Abi Endi",
    aliases: ["abi endi", "abi_endi"],
    username: "abi_endi",
    email: "abi_endi@mutabaah.local",
    binaan: ["Abi Gilang", "Abi Ikmal", "Abi Hadi", "Abi Izhan", "Abi Huda"],
  },
  {
    name: "Abi Tama",
    aliases: ["abi tama", "abi_tama"],
    username: "abi_tama",
    email: "abi_tama@mutabaah.local",
    binaan: [
      "Om Arjun",
      "Om Irfan",
      "Om Nizar",
      "Om Nopi",
      "Om Gaesang",
      "Om Andi",
      "Om Firly",
      "Om Bisri",
      "Om Saehan",
      "Om Deni",
    ],
  },
  {
    name: "Umi Ditha",
    aliases: ["umi ditha", "umi_ditha"],
    username: "umi_ditha",
    email: "umi_ditha@mutabaah.local",
    binaan: [
      "Umi Anisa",
      "Umi Salsha",
      "Umi Yulia",
      "Umi Khofifah",
      "Umi Septia",
      "Umi Sri",
      "Umi Rani",
    ],
  },
  {
    name: "Umi Indah",
    aliases: ["umi indah", "umi_indah"],
    username: "umi_indah",
    email: "umi_indah@mutabaah.local",
    binaan: ["Ummi Ovi", "Ummi Lia", "Ummi Keinida", "Ummi Dewi Permata"],
  },
  {
    name: "Umi Melisa",
    aliases: ["umi melisa", "umi_melisa"],
    username: "umi_melisa",
    email: "umi_melisa@mutabaah.local",
    binaan: [
      "Umi Yulinda",
      "Umi Nesa",
      "Umi Rizka",
      "Umi Uswah",
      "Umi Duwi",
      "Umi Harvey",
      "Umi Tirka",
    ],
  },
  {
    name: "Umi Miftah",
    aliases: ["umi miftah", "umi_miftah"],
    username: "umi_miftah",
    email: "umi_miftah@mutabaah.local",
    binaan: ["Umi Sylvi", "Umi Yeni", "Umi Sisca", "Umi Isda"],
  },
  {
    name: "Umi Navi",
    aliases: ["umi navi", "umi_navi"],
    username: "umi_navi",
    email: "umi_navi@mutabaah.local",
    binaan: [
      "Umi Puput",
      "Umi Retno",
      "Umi Fatimah",
      "Umi Dilla",
      "Umi Ranti",
      "Umi Eka",
      "Umi Cindy",
    ],
  },
  {
    name: "Umi Nia",
    aliases: ["umi nia", "umi_nia"],
    username: "umi_nia",
    email: "umi_nia@mutabaah.local",
    binaan: [
      "Umi Putri",
      "Umi Fitri",
      "Umi Dinda",
      "Umi Sari",
      "Umi Meita",
      "Umi Mita",
      "Umi Gea",
      "Umi Alin Diana Sari",
      "Umi Dwi",
    ],
  },
  {
    name: "Umi Novi",
    aliases: ["umi novi", "umi_novi"],
    username: "umi_novi",
    email: "umi_novi@mutabaah.local",
    binaan: [
      "Umi Rizki",
      "Umi Ayu",
      "Umi Aziza",
      "Umi Rafika",
      "Umi Suci",
      "Umi Raya",
      "Umi Imel",
    ],
  },
  {
    name: "Umi Okt",
    aliases: ["umi okt", "umi okta", "umi okti", "umi_okt", "umi_okti"],
    username: "umi_okti",
    email: "umi_okti@mutabaah.local",
    binaan: [
      "Umi Fina",
      "Umi Caca",
      "Umi Fitri",
      "Umi Meiga",
      "Umi Salfa",
      "Umi Nanda",
      "Umi Noor",
    ],
  },
  {
    name: "Umi Resty",
    aliases: ["umi resty", "umi_resty"],
    username: "umi_resty",
    email: "umi_resty@mutabaah.local",
    binaan: [
      "Umi Dewi",
      "Umi Leni",
      "Umi Puja",
      "Umi Salsa",
      "Umi Putri Delima",
      "Umi Lis",
      "Umi Alin Diana",
      "Umi Adel",
      "Umi Shinta",
    ],
  },
  {
    name: "Umi Tiwi",
    aliases: ["umi tiwi", "umi_tiwi"],
    username: "umi_tiwi",
    email: "umi_tiwi@mutabaah.local",
    binaan: ["Ummi Reka", "Ummi Yumi", "Ummi Lily", "Ummi Ira"],
  },
];

async function ensureMasterDataSeeded(supabase: DB) {
  try {
    const { data: existingMentors } = await supabase.from("mentors").select("id, name, email, status");
    const mentorList = existingMentors ?? [];

    for (const mData of EXACT_MASTER_DATA) {
      let mentor = mentorList.find((m) =>
        mData.aliases.some((a) => m.name.toLowerCase().includes(a) || (m.email && m.email.toLowerCase().includes(a)))
      );

      let mentorId = mentor?.id;

      if (!mentorId) {
        // ONLY insert if mentor does not exist. Never overwrite existing mentors on seed!
        const { data: inserted } = await supabase
          .from("mentors")
          .insert({ name: mData.name, email: mData.email, status: "active" })
          .select("id")
          .maybeSingle();

        if (inserted?.id) {
          mentorId = inserted.id;
        }
      }

      if (mentorId) {
        const { data: existingBinaan } = await supabase
          .from("binaan")
          .select("id, name")
          .eq("mentor_id", mentorId);
        
        const existingMap = new Map((existingBinaan ?? []).map((b) => [b.name.toLowerCase().trim(), b.id]));

        for (const bName of mData.binaan) {
          const key = bName.toLowerCase().trim();
          const existingId = existingMap.get(key);

          if (!existingId) {
            const { data: unmapped } = await supabase
              .from("binaan")
              .select("id")
              .ilike("name", bName)
              .maybeSingle();

            if (unmapped?.id) {
              await supabase.from("binaan").update({ mentor_id: mentorId }).eq("id", unmapped.id);
            } else {
              await supabase.from("binaan").insert({ name: bName, mentor_id: mentorId, status: "active" });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("ensureMasterDataSeeded error:", err);
  }
}

export async function loadAdminData(supabase: DB) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  // Seed initial master data if database missing records (never overwrites edited rows)
  await ensureMasterDataSeeded(db);

  let { data: mentorsData } = await db.from("mentors").select("id, name, email, status").order("name");
  let { data: binaanData } = await db.from("binaan").select("id, name, mentor_id, phone, status").order("name");

  const mentorsMapped = (mentorsData ?? []).map((m) => ({
    ...m,
    username: m.email ? m.email.split("@")[0] : m.name.toLowerCase().replace(/\s+/g, "_"),
  }));

  const [indicators, periods] = await Promise.all([
    db
      .from("mutabaah_indicators")
      .select("id, code, name, target, unit, order_number, active")
      .order("order_number"),
    db
      .from("mutabaah_periods")
      .select("id, start_date, end_date, status")
      .order("start_date", { ascending: false }),
  ]);

  return {
    mentors: mentorsMapped,
    binaan: binaanData ?? [],
    indicators: indicators.data ?? [],
    periods: periods.data ?? [],
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
  row: { id?: string; name: string; username?: string | null; email?: string | null; password?: string | null; status?: string }
) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback
  }

  const { id, password, username, ...values } = row;
  const cleanUsername = username?.trim().toLowerCase() || null;
  const email = values.email?.trim().toLowerCase() || (cleanUsername ? `${cleanUsername}@mutabaah.local` : `${row.name.toLowerCase().replace(/\s+/g, '_')}@mutabaah.local`);

  let mentorId = id;
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
    .select("id, name, email, status")
    .eq("id", mentorId)
    .maybeSingle();

  if (verifyErr || !verified || verified.name !== row.name.trim()) {
    return { ok: false, error: "Gagal memperbarui data mentor di database: " + (verifyErr?.message ?? "") };
  }

  if (password && email && mentorId) {
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUser?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      let authUserId: string | undefined;
      if (existing) {
        authUserId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
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
  if (row.end_date < row.start_date) {
    return { ok: false, error: "Tanggal selesai harus setelah tanggal mulai." };
  }
  const result = await upsertRow(supabase, "mutabaah_periods", row);
  if (!result.ok) return result;

  if (row.status === "active") {
    let query = supabase.from("mutabaah_periods").update({ status: "closed" }).eq("status", "active");
    const { data: current } = await supabase
      .from("mutabaah_periods")
      .select("id")
      .eq("start_date", row.start_date)
      .eq("end_date", row.end_date)
      .maybeSingle();
    if (current?.id) query = query.neq("id", current.id);
    await query;
  }
  return { ok: true };
}