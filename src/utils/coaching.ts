import { WorkoutSession, ExerciseLog, ExerciseSet } from '../data/types';
import { getExerciseById } from '../data/exercises';
import { progressionRules } from '../data/defaultPlan';

export function getProgressionSuggestion(
  exerciseId: string,
  recentSessions: WorkoutSession[]
): string | null {
  const rule = progressionRules[exerciseId];
  if (!rule) return null;

  // Find recent gym sessions that include this exercise
  const relevantLogs: ExerciseLog[] = [];
  for (const session of recentSessions) {
    if (session.data.type !== 'gym') continue;
    const log = session.data.exercises.find((e) => e.exerciseId === exerciseId);
    if (log) relevantLogs.push(log);
  }

  if (relevantLogs.length < rule.threshold) return null;

  // Check if all sets were completed in the last N sessions
  const lastN = relevantLogs.slice(-rule.threshold);
  const allCompleted = lastN.every((log) =>
    log.sets.every((set) => set.completed)
  );

  if (!allCompleted) return null;

  const exercise = getExerciseById(exerciseId);
  const lastLog = lastN[lastN.length - 1];
  const currentWeight = lastLog.sets[0]?.weight ?? 0;

  if (rule.type === 'weight') {
    const newWeight = currentWeight + rule.increment;
    return `Ready to progress! Increase ${exercise?.name} to ${newWeight}kg (+${rule.increment}kg)`;
  } else {
    const currentReps = lastLog.sets[0]?.reps ?? 0;
    return `Ready to progress! Increase ${exercise?.name} to ${currentReps + rule.increment} reps`;
  }
}

export function generateCoachingTips(sessions: WorkoutSession[]): string[] {
  const tips: string[] = [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekSessions = sessions.filter(
    (s) => new Date(s.date) >= weekAgo && s.completed
  );

  if (weekSessions.length === 0) {
    tips.push("No workouts logged this week yet. Let's get moving!");
  } else if (weekSessions.length < 4) {
    tips.push(
      `${weekSessions.length}/6 sessions done this week. Keep the momentum going!`
    );
  } else if (weekSessions.length >= 5) {
    tips.push('Crushing it this week! Make sure to get enough rest and protein.');
  }

  // Check gym balance
  const gymSessions = weekSessions.filter((s) => s.sport === 'gym');
  if (gymSessions.length === 1) {
    tips.push("Only 1 gym session so far. Try to get the second one in for balanced training.");
  }

  // Posture reminder
  tips.push(
    'Posture focus: Keep your core engaged throughout the day. Stand tall, shoulders back and down.'
  );

  // Check for skipped sessions
  const skippedRecent = sessions
    .filter((s) => new Date(s.date) >= weekAgo && s.skipped)
    .length;
  if (skippedRecent > 0) {
    tips.push(
      `${skippedRecent} session(s) skipped this week. Consistency beats intensity.`
    );
  }

  return tips;
}

export function createDefaultSets(exerciseId: string): ExerciseSet[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [{ reps: 10, weight: 0, completed: false }];

  return Array.from({ length: exercise.defaultSets }, () => ({
    reps: exercise.defaultReps,
    weight: exercise.defaultWeight,
    completed: false,
  }));
}

export function getWeekNumber(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function getRunningPaceTarget(weekNumber: number): { pace: string; distance: number } {
  const basePaceSeconds = 5 * 60 + 45; // 5:45
  const improvement = Math.min(weekNumber * 3, 30); // max 30s improvement
  const targetSeconds = basePaceSeconds - improvement;
  const min = Math.floor(targetSeconds / 60);
  const sec = targetSeconds % 60;

  const baseDistance = 7;
  const distIncrease = Math.floor(weekNumber / 2) * 0.25;
  const targetDistance = Math.min(baseDistance + distIncrease, 10);

  return {
    pace: `${min}:${sec.toString().padStart(2, '0')}`,
    distance: targetDistance,
  };
}
