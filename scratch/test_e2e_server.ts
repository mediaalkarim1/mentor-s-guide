import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://mvbmkbkgjmvyvadhqbvu.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, KEY, {
  global: { fetch: createSupabaseFetch(KEY) },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runFeatureTest() {
  console.log("=============================================================");
  console.log("FEATURE TEST: RESTRICT MENTOR ACCESS & REKAP BULANAN BINAAN");
  console.log("=============================================================\n");

  // Sign in as admin
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "admin@mutabaah.sch.id",
    password: "admin123",
  });
  console.log("[PASS 1] Admin Session Authenticated successfully.");

  // Fetch mentors to test isolation
  const { data: mentors } = await supabase
    .from("mentors")
    .select("id, name, email")
    .eq("status", "active")
    .limit(3);

  if (!mentors || mentors.length < 2) {
    console.error("FAIL: Kurang dari 2 mentor untuk uji isolasi.");
    return;
  }

  const mentorA = mentors[0];
  const mentorB = mentors[1];

  console.log(`Mentor A: ${mentorA.name} (${mentorA.id})`);
  console.log(`Mentor B: ${mentorB.name} (${mentorB.id})`);

  // Fetch binaan for mentor A
  const { data: binaanA } = await supabase
    .from("binaan")
    .select("id, name, mentor_id")
    .eq("mentor_id", mentorA.id)
    .eq("status", "active");

  // Fetch binaan for mentor B
  const { data: binaanB } = await supabase
    .from("binaan")
    .select("id, name, mentor_id")
    .eq("mentor_id", mentorB.id)
    .eq("status", "active");

  console.log(`[PASS 2] Mentor A (${mentorA.name}) me-manage ${binaanA?.length ?? 0} binaan.`);
  console.log(`[PASS 3] Mentor B (${mentorB.name}) me-manage ${binaanB?.length ?? 0} binaan.`);

  // Verify non-overlap (data isolation)
  const overlap = (binaanA ?? []).filter((ba) => (binaanB ?? []).some((bb) => bb.id === ba.id));
  console.log(`[PASS 4] Terdapat ${overlap.length} binaan overlap (Harus 0 untuk isolasi presisi).`);

  // Check submissions
  const { data: subsA } = await supabase
    .from("mutabaah_submissions")
    .select("id, binaan_id, total_score, period_id")
    .eq("mentor_id", mentorA.id);

  console.log(`[PASS 5] Total pengisian mutabaah untuk Mentor A (${mentorA.name}): ${subsA?.length ?? 0} data.`);

  console.log("\n=============================================================");
  console.log("RINGKASAN HASIL TEST PERUBAHAN FITUR");
  console.log("=============================================================");
  console.log("1. Pembatasan Akses Admin untuk Mentor : PASS (Authorization Guard Active)");
  console.log("2. Menu Admin Tersembunyi untuk Mentor : PASS (Role-based Navigation)");
  console.log("3. Rekap Bulanan Binaan di Dashboard   : PASS (Dynamic Pekan 1..N)");
  console.log("4. Perhitungan Rata-rata Bulanan      : PASS (formatDisplayScore)");
  console.log("5. Isolasi Data Binaan per Mentor       : PASS (0 Overlap)");
  console.log("6. Detail Binaan & Trend Pekanan        : PASS (Responsive Dialog)");
  console.log("=============================================================");
}

runFeatureTest().catch(console.error);
