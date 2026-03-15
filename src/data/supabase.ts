import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { WorkoutSession, UserProfile } from './types';

const SYNC_KEYS = {
  url: 'fc_supabase_url',
  key: 'fc_supabase_key',
  code: 'fc_sync_code',
} as const;

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let onRemoteChange: (() => void) | null = null;

// --- Config persistence ---

export function getSyncConfig() {
  return {
    url: localStorage.getItem(SYNC_KEYS.url) || '',
    key: localStorage.getItem(SYNC_KEYS.key) || '',
    code: localStorage.getItem(SYNC_KEYS.code) || '',
  };
}

export function saveSyncConfig(url: string, key: string, code: string) {
  localStorage.setItem(SYNC_KEYS.url, url.trim());
  localStorage.setItem(SYNC_KEYS.key, key.trim());
  localStorage.setItem(SYNC_KEYS.code, code.trim());
  // Reset client so it reconnects with new config
  disconnect();
  client = null;
}

export function isSyncEnabled(): boolean {
  const { url, key, code } = getSyncConfig();
  return !!(url && key && code);
}

// --- Client ---

function getClient(): SupabaseClient | null {
  if (client) return client;
  const { url, key } = getSyncConfig();
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

// --- Push to Supabase ---

export async function pushSession(session: WorkoutSession) {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return;

  await sb.from('sessions').upsert(
    {
      id: session.id,
      sync_code: code,
      data: session,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export async function deleteRemoteSession(id: string) {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return;

  await sb.from('sessions').delete().eq('id', id).eq('sync_code', code);
}

export async function pushProfile(profile: UserProfile) {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return;

  await sb.from('profiles').upsert(
    {
      sync_code: code,
      data: profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sync_code' }
  );
}

// --- Pull & Merge ---

export async function pullSessions(localSessions: WorkoutSession[]): Promise<WorkoutSession[]> {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return localSessions;

  const { data: rows, error } = await sb
    .from('sessions')
    .select('id, data, updated_at')
    .eq('sync_code', code);

  if (error || !rows) return localSessions;

  // Build map of remote sessions
  const remoteMap = new Map<string, { data: WorkoutSession; updated_at: string }>();
  for (const row of rows) {
    remoteMap.set(row.id, { data: row.data as WorkoutSession, updated_at: row.updated_at });
  }

  // Build map of local sessions
  const localMap = new Map<string, WorkoutSession>();
  for (const s of localSessions) {
    localMap.set(s.id, s);
  }

  // Merge: include all IDs from both, newest createdAt wins per ID
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const merged: WorkoutSession[] = [];

  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && !remote) {
      merged.push(local);
    } else if (!local && remote) {
      merged.push(remote.data);
    } else if (local && remote) {
      // Newest wins — compare createdAt or updated_at
      const localTime = new Date(local.createdAt).getTime();
      const remoteTime = new Date(remote.updated_at).getTime();
      merged.push(remoteTime > localTime ? remote.data : local);
    }
  }

  return merged;
}

export async function pullProfile(localProfile: UserProfile): Promise<UserProfile> {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return localProfile;

  const { data: row, error } = await sb
    .from('profiles')
    .select('data, updated_at')
    .eq('sync_code', code)
    .maybeSingle();

  if (error || !row) return localProfile;

  // Remote exists — use it if local has no name (fresh device) or remote is newer
  const remoteProfile = row.data as UserProfile;
  if (!localProfile.name && remoteProfile.name) return remoteProfile;

  return remoteProfile;
}

// --- Real-time subscription ---

export function subscribe(onChange: () => void) {
  const sb = getClient();
  const { code } = getSyncConfig();
  if (!sb || !code) return;

  onRemoteChange = onChange;

  // Clean up previous subscription
  if (channel) {
    sb.removeChannel(channel);
  }

  channel = sb
    .channel('sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions', filter: `sync_code=eq.${code}` },
      () => { onRemoteChange?.(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `sync_code=eq.${code}` },
      () => { onRemoteChange?.(); }
    )
    .subscribe();
}

export function disconnect() {
  const sb = getClient();
  if (channel && sb) {
    sb.removeChannel(channel);
    channel = null;
  }
  onRemoteChange = null;
}
