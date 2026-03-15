export type Sport = 'gym' | 'running' | 'basketball';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ExerciseSet {
  reps: number;
  weight: number; // kg
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  notes: string;
}

export interface GymSession {
  type: 'gym';
  variant: 'A' | 'B';
  warmup: { completed: boolean; duration: number; activity: string };
  exercises: ExerciseLog[];
  cooldown: { completed: boolean; duration: number; activity: string };
}

export interface RunningSession {
  type: 'running';
  variant: 'solo' | 'group';
  distance: number; // km
  pace: string; // mm:ss
  avgHR: number;
  duration: number; // minutes
  notes: string;
}

export interface BasketballSession {
  type: 'basketball';
  duration: number; // minutes
  avgHR: number;
  caloriesBurned: number;
  drills: string[];
  notes: string;
}

export type SessionData = GymSession | RunningSession | BasketballSession;

export interface WorkoutSession {
  id: string;
  date: string; // ISO date
  sport: Sport;
  data: SessionData;
  completed: boolean;
  skipped: boolean;
  feeling: 1 | 2 | 3 | 4 | 5; // 1=terrible, 5=great
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'compound' | 'isolation' | 'core' | 'warmup' | 'cooldown';
  muscleGroups: string[];
  equipment: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
  unit: 'kg' | 'bodyweight' | 'band';
  notes: string;
}

// Flexible weekly targets instead of fixed day assignments
export interface WeeklyTargets {
  gym: number;       // 2
  running: number;   // 2
  basketball: number; // 2
}

// Suggested (typical) day layout — a guide, not a rule
export interface TypicalDay {
  sport: Sport;
  label: string;
}

export interface WeeklySchedule {
  [key: string]: TypicalDay | null;
}

export interface ProgressionRule {
  exerciseId: string;
  type: 'weight' | 'reps' | 'sets';
  increment: number;
  condition: string;
}

export interface UserProfile {
  name: string;
  goals: string[];
  weeklyTargets: WeeklyTargets;
  typicalSchedule: WeeklySchedule; // suggested days, not enforced
  startDate: string;
  currentWeek: number;
}

export interface WeeklyCheckIn {
  id: string;
  weekNumber: number;
  date: string;
  sessionsCompleted: number;
  sessionsPlanned: number;
  bodyWeight?: number;
  notes: string;
  nextWeekFocus: string[];
}
