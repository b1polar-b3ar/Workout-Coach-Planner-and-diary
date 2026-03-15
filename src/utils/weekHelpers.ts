import { format, startOfWeek, endOfWeek } from 'date-fns';
import { WorkoutSession, Sport, WeeklyTargets, DayOfWeek } from '../data/types';

/** Get ISO date strings for current week (Mon-Sun) */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const ws = startOfWeek(now, { weekStartsOn: 1 });
  const we = endOfWeek(now, { weekStartsOn: 1 });
  return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
}

/** Count completed sessions by sport for this week */
export function getWeekCounts(sessions: WorkoutSession[]): Record<Sport, number> {
  const { start, end } = getCurrentWeekRange();
  const weekSessions = sessions.filter(
    (s) => s.date >= start && s.date <= end && s.completed
  );
  return {
    gym: weekSessions.filter((s) => s.sport === 'gym').length,
    running: weekSessions.filter((s) => s.sport === 'running').length,
    basketball: weekSessions.filter((s) => s.sport === 'basketball').length,
  };
}

/** What's still remaining this week? */
export function getRemaining(
  sessions: WorkoutSession[],
  targets: WeeklyTargets
): { sport: Sport; label: string; remaining: number }[] {
  const counts = getWeekCounts(sessions);
  const result: { sport: Sport; label: string; remaining: number }[] = [];

  if (counts.gym < targets.gym)
    result.push({ sport: 'gym', label: 'Gym', remaining: targets.gym - counts.gym });
  if (counts.running < targets.running)
    result.push({ sport: 'running', label: 'Running', remaining: targets.running - counts.running });
  if (counts.basketball < targets.basketball)
    result.push({ sport: 'basketball', label: 'Basketball', remaining: targets.basketball - counts.basketball });

  return result;
}

/** Suggest what to do today based on typical schedule + what's remaining */
export function suggestToday(
  sessions: WorkoutSession[],
  targets: WeeklyTargets,
  typicalSchedule: Record<string, { sport: Sport; label: string } | null>
): { sport: Sport; label: string } | null {
  const remaining = getRemaining(sessions, targets);
  if (remaining.length === 0) return null;

  const dayName = format(new Date(), 'EEEE') as DayOfWeek;

  // Already logged today?
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const loggedToday = sessions.find((s) => s.date === todayStr && s.completed);
  if (loggedToday) return null;

  // If the typical schedule says something for today and it's still needed, suggest that
  const typical = typicalSchedule[dayName];
  if (typical) {
    const match = remaining.find((r) => r.sport === typical.sport);
    if (match) return { sport: match.sport, label: match.label };
  }

  // Otherwise suggest the first remaining sport
  return { sport: remaining[0].sport, label: remaining[0].label };
}

/** Determine which gym variant (A or B) to do next based on completed gym sessions this week */
export function getNextGymVariant(sessions: WorkoutSession[]): 'A' | 'B' {
  const { start, end } = getCurrentWeekRange();
  const weekGym = sessions.filter(
    (s) => s.date >= start && s.date <= end && s.sport === 'gym' && s.completed && s.data.type === 'gym'
  );

  // If no gym sessions this week, start with A
  if (weekGym.length === 0) return 'A';

  // If already did A, do B (and vice versa)
  const lastVariant = (weekGym[weekGym.length - 1].data as { variant?: string }).variant;
  return lastVariant === 'A' ? 'B' : 'A';
}
