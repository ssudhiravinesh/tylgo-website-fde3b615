/**
 * Session Cache — resolves showroomId, brandId, and isSuperAdmin ONCE
 * and caches the result for the lifetime of the session (with a 5-min TTL).
 *
 * BEFORE: every fetch function independently called getUser() + profiles.select('role')
 * + getShowroomId() — ~4 Supabase round-trips PER function.
 * When 5 hooks fired simultaneously: ~21 redundant API calls.
 *
 * AFTER: first call resolves everything in 2-3 calls, subsequent calls are instant.
 */

import { supabase } from '@/integrations/supabase/client';

interface SessionInfo {
  showroomId: string | null;
  brandId: string | null;
  isSuperAdmin: boolean;
}

let cachedSession: SessionInfo | null = null;
let cacheTimestamp = 0;
let inflight: Promise<SessionInfo> | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Returns cached session info (showroomId, brandId, isSuperAdmin).
 * First call makes 2-3 Supabase requests; subsequent calls return instantly.
 * Multiple concurrent callers share the same in-flight promise (deduplication).
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  // Return cached if fresh
  if (cachedSession && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSession;
  }

  // Deduplicate: if a fetch is already in-flight, wait for it
  if (inflight) {
    return inflight;
  }

  inflight = resolveSessionInfo();

  try {
    const result = await inflight;
    cachedSession = result;
    cacheTimestamp = Date.now();
    return result;
  } finally {
    inflight = null;
  }
}

async function resolveSessionInfo(): Promise<SessionInfo> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { showroomId: null, brandId: null, isSuperAdmin: false };
  }

  // Single profile query fetches BOTH role and showroom_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, showroom_id')
    .eq('id', user.id)
    .single();

  const showroomId = profile?.showroom_id || null;
  const isSuperAdmin = profile?.role === 'super_admin';

  // Resolve brand_id from showroom (only if showroom exists)
  let brandId: string | null = null;
  if (showroomId) {
    const { data: showroom } = await supabase
      .from('showrooms')
      .select('brand_id')
      .eq('id', showroomId)
      .single();
    brandId = showroom?.brand_id || null;
  }

  return { showroomId, brandId, isSuperAdmin };
}

/**
 * Clear the session cache. Call on logout or auth state change.
 */
export function clearSessionCache(): void {
  cachedSession = null;
  cacheTimestamp = 0;
  inflight = null;
}

// Auto-clear cache on auth state changes (login/logout).
// Subscription is captured for proper cleanup if ever needed.
const { data: { subscription: _authSubscription } } = supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
    clearSessionCache();
  }
});
