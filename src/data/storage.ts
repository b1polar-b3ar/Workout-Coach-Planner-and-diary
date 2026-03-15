import { WorkoutSession, UserProfile, WeeklyCheckIn } from './types';
import { defaultSchedule } from './defaultPlan';

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
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter((s) => s.id !== id);
  save(KEYS.sessions, sessions);
}

export function getSessionsByDateRange(start: string, end: string): WorkoutSession[] {
  return getSessions().filter((s) => s.date >= start && s.date <= end);
}

export function getSessionsBySport(sport: string): WorkoutSession[] {
  return getSessions().filter((s) => s.sport === sport);
}

// Profile
export function getProfile(): UserProfile {
  return load<UserProfile>(KEYS.profile, {
    name: '',
    goals: ['Build lean muscle', 'Improve posture', 'Improve running pace', 'Learn basketball'],
    weeklySchedule: defaultSchedule,
    startDate: new Date().toISOString().split('T')[0],
    currentWeek: 1,
  });
}

export function saveProfile(profile: UserProfile) {
  save(KEYS.profile, profile);
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
