import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient<any, "public", any>;

const MASTER_SEED_DATA = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    name: "Umi Indah",
    email: "umi_indah@mutabaah.local",
    binaan: [
      "Umi Frisca",
      "Umi Nina",
      "Umi Nely",
      "Umi Atika",
      "Umi Yuni",
      "Umi Desty",
      "Umi Aulia",
      "Ummi Ovi",
      "Ummi Lia",
      "Ummi Keinida",
      "Ummi Dewi Permata",
    ],
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    name: "Umi Melisa",
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
    id: "a1000000-0000-0000-0000-000000000003",
    name: "Umi Navi",
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
    id: "a1000000-0000-0000-0000-000000000004",
    name: "Umi Novi",
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
    id: "a1000000-0000-0000-0000-000000000005",
    name: "Umi Okti",
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
    id: "a1000000-0000-0000-0000-000000000006",
    name: "Umi Ditha",
    email: "umi_ditha@mutabaah.local",
    binaan: [
      "Umi Anisa",
      "Umi Salsa",
      "Umi Yulia",
      "Umi Khofifah",
      "Umi Septia",
      "Umi Sri",
      "Umi Rani",
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Abi Azam",
    email: "abi_azam@mutabaah.local",
    binaan: ["Abi Erle", "Abi Helmi", "Abi Ma’ares", "Abi Willy"],
  },
  {
    id: "a1000000-0000-0000-0000-000000000008",
    name: "Umi Resty",
    email: "umi_resty@mutabaah.local",
    binaan: [
      "Umi Dewi",
      "Umi Leni",
      "Umi Puja",
      "Umi Salsa",
      "Umi Putri Delima",
      "Umi Iis",
      "Umi Alin Diana",
      "Umi Adel",
      "Umi Shinta",
    ],
  },
  {
    id: "a1000000-0000-0000-0000-000000000009",
    name: "Umi Nia",
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
    id: "a1000000-0000-0000-0000-000000000010",
    name: "Umi Tiwi",
    email: "umi_tiwi@mutabaah.local",
    binaan: ["Ummi Reka", "Ummi Yumi", "Ummi Lily", "Ummi Ira"],
  },
  {
    id: "a1000000-0000-0000-0000-000000000011",
    name: "Umi Miftah",
    email: "umi_miftah@mutabaah.local",
    binaan: ["Umi Sylvi", "Umi Yeni", "Umi Sisca", "Umi Isda"],
  },
  {
    id: "a1000000-0000-0000-0000-000000000012",
    name: "Abi Endi",
    email: "abi_endi@mutabaah.local",
    binaan: ["Abi Gilang", "Abi Ikmal", "Abi Hadi", "Abi Izhan", "Abi Huda"],
  },
  {
    id: "a1000000-0000-0000-0000-000000000013",
    name: "Abi Tama",
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
];

async function ensureMasterDataSeeded(supabase: DB) {
  const { data: existingMentors } = await supabase.from("mentors").select("id, name");
  const mentorMap = new Map((existingMentors ?? []).map((m) => [m.name, m.id]));

  for (const mData of MASTER_SEED_DATA) {
    let mentorId = mentorMap.get(mData.name);

    if (!mentorId) {
      const { data: inserted } = await supabase
        .from("mentors")
        .insert({ id: mData.id, name: mData.name, email: mData.email, status: "active" })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        mentorId = inserted.id;
        mentorMap.set(mData.name, mentorId);
      }
    }

    if (mentorId) {
      const { data: existingBinaan } = await supabase
        .from("binaan")
        .select("name")
        .eq("mentor_id", mentorId);
      const existingBinaanNames = new Set((existingBinaan ?? []).map((b) => b.name));

      const missingBinaan = mData.binaan.filter((bName) => !existingBinaanNames.has(bName));
      if (missingBinaan.length > 0) {
        await supabase.from("binaan").insert(
          missingBinaan.map((bName) => ({
            name: bName,
            mentor_id: mentorId!,
            status: "active",
          })),
        );
      }
    }
  }
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function loadAdminData(supabase: DB) {
  let db = supabase;
  try {
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      db = supabaseAdmin as unknown as DB;
    }
  } catch (e) {
    // fallback to provided client
  }

  let { data: mentorsData } = await db.from("mentors").select("id, name, email, status").order("name");
  let { data: binaanData, error: bErr } = await db.from("binaan").select("id, name, mentor_id, phone, status").order("name");
  if (bErr || !binaanData) {
    const fallback = await db.from("binaan").select("id, name, mentor_id, phone, status").order("name");
    binaanData = fallback.data ?? [];
  }

  if (!mentorsData || mentorsData.length < 13 || !binaanData || binaanData.length < 85) {
    await ensureMasterDataSeeded(db);
    const mRes = await db.from("mentors").select("id, name, email, status").order("name");
    const bRes = await db.from("binaan").select("id, name, mentor_id, phone, status").order("name");
    mentorsData = mRes.data ?? [];
    binaanData = bRes.data ?? [];
  }

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
    mentors: mentorsData ?? [],
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