// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Client-side: safe to use in the browser — uses the public anon key,
// restricted by Row Level Security policies (set up in Phase 2).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side only (API routes) — uses the service role key, which
// bypasses Row Level Security. Never import this in browser-facing code.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
