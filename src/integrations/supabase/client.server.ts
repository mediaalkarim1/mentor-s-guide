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

  const SUPABASE_URL =
    procEnv['SUPABASE_URL'] ||
    procEnv['VITE_SUPABASE_URL'] ||
    metaEnv['VITE_SUPABASE_URL'] ||
    metaEnv['SUPABASE_URL'] ||
    'https://placeholder.supabase.co';

  const SUPABASE_SERVICE_ROLE_KEY =
    procEnv['SUPABASE_SERVICE_ROLE_KEY'] ||
    procEnv['SUPABASE_SECRET_KEY'] ||
    procEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    metaEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    'placeholder-key';

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

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
