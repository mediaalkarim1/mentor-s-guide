// Server-side Supabase client with service role key - bypasses RLS.
// Safe fallback environment variable resolution for server functions.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseAdminClient() {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string>);

  // Cloudflare Workers: try to get env from request context binding
  let cfEnv: Record<string, string> = {};
  try {
    // @ts-ignore - Cloudflare Workers specific
    const ctx = globalThis.__rlsEnvCache || {};
    cfEnv = ctx;
  } catch (_) {}

  // Also try globalThis for Cloudflare Workers env vars
  const gThis = typeof globalThis !== 'undefined' ? (globalThis as any) : {};

  const SUPABASE_URL =
    procEnv['SUPABASE_URL'] ||
    procEnv['VITE_SUPABASE_URL'] ||
    gThis['SUPABASE_URL'] ||
    cfEnv['SUPABASE_URL'] ||
    metaEnv['VITE_SUPABASE_URL'] ||
    metaEnv['SUPABASE_URL'] ||
    'https://mvbmkbkgjmvyvadhqbvu.supabase.co';

  // Priority: real service_role key from Cloudflare Workers secrets > publishable key fallback
  // SUPABASE_SERVICE_ROLE_KEY is set as a secret in Cloudflare Workers dashboard
  const SUPABASE_SERVICE_ROLE_KEY =
    procEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    gThis['SUPABASE_SERVICE_ROLE_KEY'] ||
    cfEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    procEnv['SUPABASE_SECRET_KEY'] ||
    metaEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    // Only fall back to publishable key if nothing better is available
    procEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    gThis['SUPABASE_PUBLISHABLE_KEY'] ||
    cfEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    'sb_publishable_ygKD2Pijsuxbh9K6kdmYjg_OC_3gykK';

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}




let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;
let _lastResolvedKey: string | undefined;
let _lastResolvedUrl: string | undefined;

export function getSupabaseAdminClient() {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string>);

  let cfEnv: Record<string, string> = {};
  try {
    cfEnv = (globalThis as any).__rlsEnvCache || (globalThis as any).__cf_env || {};
  } catch (_) {}

  const gThis = typeof globalThis !== 'undefined' ? (globalThis as any) : {};

  const currentUrl =
    procEnv['SUPABASE_URL'] ||
    procEnv['VITE_SUPABASE_URL'] ||
    gThis['SUPABASE_URL'] ||
    cfEnv['SUPABASE_URL'] ||
    metaEnv['VITE_SUPABASE_URL'] ||
    metaEnv['SUPABASE_URL'] ||
    'https://mvbmkbkgjmvyvadhqbvu.supabase.co';

  const currentKey =
    procEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    gThis['SUPABASE_SERVICE_ROLE_KEY'] ||
    cfEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    procEnv['SUPABASE_SECRET_KEY'] ||
    metaEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    procEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    gThis['SUPABASE_PUBLISHABLE_KEY'] ||
    cfEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    'sb_publishable_ygKD2Pijsuxbh9K6kdmYjg_OC_3gykK';

  if (!_supabaseAdmin || _lastResolvedKey !== currentKey || _lastResolvedUrl !== currentUrl) {
    _supabaseAdmin = createSupabaseAdminClient();
    _lastResolvedKey = currentKey;
    _lastResolvedUrl = currentUrl;
  }

  return _supabaseAdmin;
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    const client = getSupabaseAdminClient();
    return Reflect.get(client, prop, receiver);
  },
});

