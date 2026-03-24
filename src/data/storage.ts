import { WorkoutSession, UserProfile, WeeklyCheckIn } from './types';
import { defaultTargets, typicalSchedule } from './defaultPlan';
import { isSyncEnabled, pushSession, pushProfile, deleteRemoteSession, pullSessions, pullProfile } from './supabase';

const KEYS = {
  sessions: 'fc_sessions',
  profile: 'fc_profile',
  checkIns: 'fc_checkins',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Sessions
export function getSessions(): WorkoutSession[] {
  return load<WorkoutSession[]>(KEYS.sessions, []);
}

export function saveSession(session: WorkoutSession) {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  save(KEYS.sessions, sessions);

  // Fire-and-forget sync to Supabase
  if (isSyncEnabled()) {
    pushSession(session).catch(() => {});
  }
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter((s) => s.id !== id);
  save(KEYS.sessions, sessions);

  if (isSyncEnabled()) {
    deleteRemoteSession(id).catch(() => {});
  }
}

export function getSessionsByDateRange(start: string, end: string): WorkoutSession[] {
  return getSessions().filter((s) => s.date >= start && s.date <= end);
}

export function getSessionsBySport(sport: string): WorkoutSession[] {
  return getSessions().filter((s) => s.sport === sport);
}

// Profile
const defaultProfile: UserProfile = {
  name: '',
  goals: ['Build lean muscle', 'Improve posture', 'Improve running pace', 'Learn basketball'],
  weeklyTargets: defaultTargets,
  typicalSchedule: typicalSchedule,
  startDate: new Date().toISOString().split('T')[0],
  currentWeek: 1,
};

export function getProfile(): UserProfile {
  return load<UserProfile>(KEYS.profile, defaultProfile);
}

export function saveProfile(profile: UserProfile) {
  save(KEYS.profile, profile);

  if (isSyncEnabled()) {
    pushProfile(profile).catch(() => {});
  }
}

// Weekly Check-ins
export function getCheckIns(): WeeklyCheckIn[] {
  return load<WeeklyCheckIn[]>(KEYS.checkIns, []);
}

export function saveCheckIn(checkIn: WeeklyCheckIn) {
  const checkIns = getCheckIns();
  const idx = checkIns.findIndex((c) => c.id === checkIn.id);
  if (idx >= 0) {
    checkIns[idx] = checkIn;
  } else {
    checkIns.push(checkIn);
  }
  save(KEYS.checkIns, checkIns);
}

// --- Cloud sync: pull & merge ---

export async function syncFromCloud(): Promise<boolean> {
  if (!isSyncEnabled()) return false;

  try {
    const [mergedSessions, mergedProfile] = await Promise.all([
      pullSessions(getSessions()),
      pullProfile(getProfile()),
    ]);

    save(KEYS.sessions, mergedSessions);
    save(KEYS.profile, mergedProfile);

    // Push any local-only sessions back to cloud
    const remoteIds = new Set(mergedSessions.map((s) => s.id));
    const localSessions = getSessions();
    for (const s of localSessions) {
      if (!remoteIds.has(s.id)) {
        pushSession(s).catch(() => {});
      }
    }

    return true;
  } catch {
    return false;
  }
}
