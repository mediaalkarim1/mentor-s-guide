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
const PUBLISHABLE_KEY = "sb_publishable_ygKD2Pijsuxbh9K6kdmYjg_OC_3gykK";

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

const supabaseAdmin = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  global: { fetch: createSupabaseFetch(PUBLISHABLE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testAdminFetch() {
  const { data: mentors, error: mErr } = await supabaseAdmin.from("mentors").select("id, name, status");
  console.log("All Mentors in DB:", mentors, mErr?.message);

  const { data: binaan, error: bErr } = await supabaseAdmin.from("binaan").select("id, name, status");
  console.log("All Binaan in DB:", binaan, bErr?.message);
}

testAdminFetch().catch(console.error);
