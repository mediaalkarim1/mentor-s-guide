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

const SUPABASE_URL = "https://mvbmkbkgjmvyvadhqbvu.supabase.co";
const KEY = "sb_publishable_ygKD2Pijsuxbh9K6kdmYjg_OC_3gykK";

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

async function testFetchData() {
  console.log("Fetching mentors...");
  const { data: mentors, error: mErr } = await supabase.from("mentors").select("id, name").eq("status", "active");
  console.log("Mentors count:", mentors?.length, "Error:", mErr?.message);

  console.log("Fetching binaan...");
  const { data: binaan, error: bErr } = await supabase.from("binaan").select("id, name, mentor_id").eq("status", "active");
  console.log("Binaan count:", binaan?.length, "Error:", bErr?.message);

  console.log("Fetching indicators...");
  const { data: indicators, error: iErr } = await supabase.from("mutabaah_indicators").select("id, name").eq("active", true);
  console.log("Indicators count:", indicators?.length, "Error:", iErr?.message);

  console.log("Fetching period...");
  const { data: period, error: pErr } = await supabase.from("mutabaah_periods").select("id, start_date").eq("status", "active");
  console.log("Period:", period, "Error:", pErr?.message);
}

testFetchData().catch(console.error);
