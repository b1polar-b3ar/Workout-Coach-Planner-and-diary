import { WeeklySchedule, ExerciseLog } from './types';

export const defaultSchedule: WeeklySchedule = {
  Monday: { sport: 'gym', label: 'Gym - Session A (Pull Focus)' },
  Tuesday: { sport: 'running', label: 'Running' },
  Wednesday: { sport: 'basketball', label: 'Basketball' },
  Thursday: { sport: 'gym', label: 'Gym - Session B (Push Focus)' },
  Friday: { sport: 'running', label: 'Running' },
  Saturday: { sport: 'basketball', label: 'Basketball' },
  Sunday: null,
};

// Session A: Deadlift day / Pull focus + core
export const gymSessionA: Omit<ExerciseLog, 'sets'>[] = [
  { exerciseId: 'deadlift', exerciseName: 'Deadlift', notes: '' },
  { exerciseId: 'kettlebell-swing', exerciseName: 'Kettlebell Swing', notes: '' },
  { exerciseId: 'lat-pulldown', exerciseName: 'Lat Pulldown', notes: 'Or assisted pull-ups' },
  { exerciseId: 'seated-cable-row', exerciseName: 'Seated Cable Row', notes: '' },
  { exerciseId: 'face-pull', exerciseName: 'Face Pull', notes: 'Posture correction' },
  { exerciseId: 'dead-bug', exerciseName: 'Dead Bug', notes: 'Core & posture' },
  { exerciseId: 'hanging-leg-raise', exerciseName: 'Hanging Leg Raise', notes: '' },
];

// Session B: Press day / Push focus + core
export const gymSessionB: Omit<ExerciseLog, 'sets'>[] = [
  { exerciseId: 'goblet-squat', exerciseName: 'Goblet Squat', notes: '' },
  { exerciseId: 'db-incline-press', exerciseName: 'Dumbbell Incline Press', notes: '' },
  { exerciseId: 'overhead-press', exerciseName: 'Dumbbell Overhead Press', notes: '' },
  { exerciseId: 'renegade-row', exerciseName: 'Renegade Row', notes: '' },
  { exerciseId: 'glute-bridge', exerciseName: 'Glute Bridge', notes: 'Posture correction' },
  { exerciseId: 'bird-dog', exerciseName: 'Bird Dog', notes: 'Core & posture' },
  { exerciseId: 'ab-wheel-rollout', exerciseName: 'Ab Wheel Rollout', notes: '' },
];

// Basketball drills for a beginner training solo
export const basketballDrills = [
  'Ball handling / dribbling drills (10 min)',
  'Shooting form practice - close range (10 min)',
  'Free throws (10 min)',
  'Layup drills - both sides (10 min)',
  'Defensive slides & footwork (5 min)',
  'Pick-up games or 1v1 if available',
];

// Running progression plan
export const runningProgression = {
  solo: {
    currentPace: '5:45',
    currentDistance: 7,
    targetPace: '5:15',
    targetDistance: 10,
    weeklyPaceImprovement: 3, // seconds
    weeklyDistanceIncrease: 0.25, // km every 2 weeks
  },
  group: {
    currentPace: '6:32',
    currentDistance: 7.5,
    notes: 'Social runs, keep conversational pace. Build endurance.',
  },
};

// Progressive overload rules
export const progressionRules: Record<string, { type: 'weight' | 'reps'; increment: number; threshold: number }> = {
  'deadlift': { type: 'weight', increment: 2.5, threshold: 2 },
  'kettlebell-swing': { type: 'reps', increment: 2, threshold: 2 },
  'db-incline-press': { type: 'weight', increment: 1, threshold: 2 },
  'lat-pulldown': { type: 'weight', increment: 2.5, threshold: 2 },
  'assisted-pullup': { type: 'reps', increment: 1, threshold: 2 },
  'seated-cable-row': { type: 'weight', increment: 2.5, threshold: 2 },
  'renegade-row': { type: 'weight', increment: 1, threshold: 3 },
  'face-pull': { type: 'reps', increment: 2, threshold: 2 },
  'goblet-squat': { type: 'weight', increment: 2, threshold: 2 },
  'overhead-press': { type: 'weight', increment: 1, threshold: 2 },
  'glute-bridge': { type: 'reps', increment: 2, threshold: 2 },
};
