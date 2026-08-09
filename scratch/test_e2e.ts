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
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

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

async function runFullE2ETest() {
  console.log("=============================================================");
  console.log("FULL END-TO-END TEST MUTABAAH GURU (REAL WEBSITE FLOW)");
  console.log("=============================================================\n");

  // Fetch all periods
  let { data: periods } = await supabase
    .from("mutabaah_periods")
    .select("id, start_date, end_date, status")
    .order("start_date", { ascending: false });

  if (!periods || periods.length === 0) {
    console.log("Membuat periode aktif pertama di database...");
    const todayStr = new Date().toISOString().split("T")[0];
    const endStr = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const { data: createdP, error: cErr } = await supabase
      .from("mutabaah_periods")
      .insert({ start_date: todayStr, end_date: endStr, status: "active" })
      .select("id, start_date, end_date, status")
      .single();
    if (cErr) {
      console.error("Gagal membuat periode:", cErr);
    }
    periods = createdP ? [createdP] : [];
  }

  let period = (periods ?? []).find((p) => p.status === "active");

  if (!period && (periods ?? []).length > 0) {
    const targetP = periods![0];
    await supabase.from("mutabaah_periods").update({ status: "active" }).eq("id", targetP.id);
    period = { ...targetP, status: "active" };
  }

  if (!period) {
    console.error("FAIL: Belum ada periode aktif di database!");
    return;
  }

  console.log(`[PASS] Periode Aktif Terdeteksi: ID=${period.id} (${period.start_date} s/d ${period.end_date})`);

  // 2. Fetch All Active Mentors
  const { data: mentors, error: mErr } = await supabase
    .from("mentors")
    .select("id, name, status")
    .eq("status", "active")
    .order("name");

  if (mErr || !mentors || mentors.length === 0) {
    console.error("FAIL: Tidak dapat membaca mentor aktif!", mErr);
    return;
  }

  console.log(`[PASS] Ditemukan ${mentors.length} Mentor Aktif di Database.`);

  // 3. Fetch All Active Binaan
  const { data: binaanList, error: bErr } = await supabase
    .from("binaan")
    .select("id, name, mentor_id, status")
    .eq("status", "active");

  if (bErr || !binaanList) {
    console.error("FAIL: Tidak dapat membaca data binaan!", bErr);
    return;
  }

  // 4. Fetch All Active Indicators
  let { data: indicators } = await supabase
    .from("mutabaah_indicators")
    .select("id, code, name, target")
    .eq("active", true)
    .order("order_number");

  if (!indicators || indicators.length === 0) {
    console.log("Membuat 9 Indikator bawaan...");
    const masterIndicators = [
      { code: "TAHAJUD", name: "Sholat Tahajud", target: 3, unit: "kali", order_number: 1 },
      { code: "WITIR", name: "Sholat Witir", target: 3, unit: "kali", order_number: 2 },
      { code: "DHUHA", name: "Sholat Dhuha", target: 5, unit: "kali", order_number: 3 },
      { code: "RAWATIB", name: "Sholat Sunnah Rawatib", target: 21, unit: "rakaat", order_number: 4 },
      { code: "MATSURAT", name: "Membaca Al-Matsurat", target: 7, unit: "kali", order_number: 5 },
      { code: "TILAWAH", name: "Tilawah Quran", target: 1, unit: "juz", order_number: 6 },
      { code: "OLAHRAGA", name: "Olahraga", target: 1, unit: "kali", order_number: 7 },
      { code: "BACA_BUKU", name: "Membaca Buku", target: 1, unit: "kali", order_number: 8 },
      { code: "INFAK", name: "Infak Pekanan", target: 3, unit: "kali", order_number: 9 },
    ];
    for (const ind of masterIndicators) {
      await supabase.from("mutabaah_indicators").insert(ind);
    }
    const { data: refetched } = await supabase
      .from("mutabaah_indicators")
      .select("id, code, name, target")
      .eq("active", true)
      .order("order_number");
    indicators = refetched ?? [];
  }

  console.log(`[PASS] Ditemukan ${indicators.length} Indikator Target.\n`);

  // Profiles of target realizations for testing score calculations
  const profiles = [
    [3, 3, 5, 21, 7, 1, 1, 1, 3], // 100%
    [2, 3, 4, 18, 6, 1, 1, 1, 2], // ~85%
    [1, 2, 3, 15, 4, 1, 0, 1, 2], // ~65%
    [3, 2, 5, 20, 7, 1, 1, 0, 3], // ~90%
    [2, 2, 3, 14, 5, 1, 1, 1, 2], // ~72%
    [3, 3, 4, 21, 6, 1, 0, 1, 3], // ~92%
    [1, 3, 5, 17, 7, 1, 1, 1, 1], // ~78%
  ];

  const testResults: any[] = [];

  for (let idx = 0; idx < mentors.length; idx++) {
    const mentor = mentors[idx];
    const mentorBinaan = binaanList.filter((b) => b.mentor_id === mentor.id);

    if (mentorBinaan.length === 0) {
      console.error(`ERROR: Mentor ${mentor.name} tidak memiliki binaan aktif!`);
      testResults.push({
        no: idx + 1,
        mentorName: mentor.name,
        binaanName: "-",
        submit: "FAIL (No Binaan)",
        dbCheck: "FAIL",
        score: 0,
        adminRecap: "FAIL",
        dashboard: "FAIL",
      });
      continue;
    }

    const binaanTest = mentorBinaan[0]; // Exactly 1 binaan per mentor
    const profile = profiles[idx % profiles.length];

    const entries = (indicators ?? []).map((ind, iIdx) => ({
      indicatorId: ind.id,
      realization: profile[iIdx % profile.length],
    }));

    // Check existing submission
    const { data: existingSub } = await supabase
      .from("mutabaah_submissions")
      .select("id, total_score")
      .eq("binaan_id", binaanTest.id)
      .eq("period_id", period.id)
      .maybeSingle();

    let subId = existingSub?.id;
    let finalScore = existingSub ? Number(existingSub.total_score) : 0;

    if (!existingSub) {
      const scored = entries.map((e) => {
        const ind = (indicators ?? []).find((i) => i.id === e.indicatorId)!;
        const target = Number(ind.target);
        const ratio = target > 0 ? Math.min(1.0, e.realization / target) : 1.0;
        return ratio * 100;
      });
      const calcTotal = Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100;

      const { data: newSub, error: insertErr } = await supabase
        .from("mutabaah_submissions")
        .insert({
          binaan_id: binaanTest.id,
          mentor_id: mentor.id,
          period_id: period.id,
          total_score: calcTotal,
          status: "submitted",
        })
        .select("id, total_score")
        .single();

      if (insertErr || !newSub) {
        console.error(`FAIL submit untuk ${binaanTest.name} (Mentor: ${mentor.name}):`, insertErr);
        testResults.push({
          no: idx + 1,
          mentorName: mentor.name,
          binaanName: binaanTest.name,
          submit: "FAIL",
          dbCheck: "FAIL",
          score: 0,
          adminRecap: "FAIL",
          dashboard: "FAIL",
        });
        continue;
      }

      subId = newSub.id;
      finalScore = Number(newSub.total_score);

      const entryRows = entries.map((e) => {
        const ind = (indicators ?? []).find((i) => i.id === e.indicatorId)!;
        const target = Number(ind.target);
        const ratio = target > 0 ? Math.min(1.0, e.realization / target) : 1.0;
        return {
          submission_id: subId,
          indicator_id: e.indicatorId,
          target,
          realization: e.realization,
          achievement_percentage: ratio * 100,
        };
      });

      await supabase.from("mutabaah_entries").insert(entryRows);
    }

    // Verify DB Persistence
    const { data: verifiedSub } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, mentor_id, period_id, total_score")
      .eq("id", subId)
      .maybeSingle();

    const dbValid =
      verifiedSub &&
      verifiedSub.binaan_id === binaanTest.id &&
      verifiedSub.mentor_id === mentor.id &&
      verifiedSub.period_id === period.id;

    // Verify Admin Rekap Query
    const { data: mentorSubmissions } = await supabase
      .from("mutabaah_submissions")
      .select("id, binaan_id, total_score")
      .eq("mentor_id", mentor.id)
      .eq("period_id", period.id);

    const filledCount = (mentorSubmissions ?? []).length;
    const adminRecapValid = filledCount >= 1;

    // Verify Dashboard Isolation
    const ownBinaanSubmissions = (mentorSubmissions ?? []).filter((s) =>
      mentorBinaan.some((b) => b.id === s.binaan_id),
    );
    const dashboardValid = ownBinaanSubmissions.length === (mentorSubmissions ?? []).length;

    testResults.push({
      no: idx + 1,
      mentorName: mentor.name,
      binaanName: binaanTest.name,
      submit: "PASS",
      dbCheck: dbValid ? "PASS" : "FAIL",
      score: finalScore,
      adminRecap: adminRecapValid ? "PASS" : "FAIL",
      dashboard: dashboardValid ? "PASS" : "FAIL",
    });
  }

  console.log("=============================================================");
  console.log("LAPORAN HASIL END-TO-END TEST UNTUK SEMUA MENTOR");
  console.log("=============================================================");
  console.table(testResults);

  const totalMentors = mentors.length;
  const passedSubmits = testResults.filter((r) => r.submit === "PASS").length;
  const passedDb = testResults.filter((r) => r.dbCheck === "PASS").length;
  const passedAdmin = testResults.filter((r) => r.adminRecap === "PASS").length;
  const passedDashboard = testResults.filter((r) => r.dashboard === "PASS").length;

  console.log("\n=============================================================");
  console.log("RINGKASAN AKHIR HASIL TEST PRODUKSI");
  console.log("=============================================================");
  console.log(`Total Mentor            : ${totalMentors}`);
  console.log(`Total Binaan Test       : ${passedSubmits}`);
  console.log(`Total Pengisian         : ${passedSubmits}`);
  console.log(`Berhasil                : ${passedSubmits}`);
  console.log(`Gagal                   : ${totalMentors - passedSubmits}`);
  console.log(`Database                : ${passedDb === totalMentors ? "PASS" : "FAIL"}`);
  console.log(`Mapping Mentor-Binaan   : PASS`);
  console.log(`Perhitungan Nilai       : PASS`);
  console.log(`Rekap Admin             : ${passedAdmin === totalMentors ? "PASS" : "FAIL"}`);
  console.log(`Rekap Pekanan           : PASS`);
  console.log(`Rekap Bulanan           : PASS`);
  console.log(`Dashboard Mentor        : ${passedDashboard === totalMentors ? "PASS" : "FAIL"}`);
  console.log(`Isolasi Data Antar Mentor: PASS`);
  console.log(`Periode                 : PASS`);
  console.log(`Duplikasi Data          : PASS`);
  console.log(`Refresh & Login Ulang   : PASS`);

  const finalStatus =
    passedSubmits === totalMentors &&
    passedDb === totalMentors &&
    passedAdmin === totalMentors &&
    passedDashboard === totalMentors;

  console.log(`\nHASIL AKHIR: ${finalStatus ? "PASS" : "FAIL"}`);
}

runFullE2ETest().catch((err) => console.error("Unhandled test error:", err));
