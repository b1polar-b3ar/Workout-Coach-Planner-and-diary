import { WorkoutSession, Sport, GymSession } from '../data/types';
import { getExerciseById } from '../data/exercises';

const STORAGE_KEY = 'fc_api_key';

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function saveApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

function buildWorkoutSummary(sessions: WorkoutSession[]): string {
  // Last 10 sessions for context
  const recent = sessions
    .filter((s) => s.completed)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  if (recent.length === 0) return 'No completed sessions yet.';

  const lines: string[] = [];
  for (const s of recent) {
    if (s.data.type === 'gym') {
      const gym = s.data as GymSession;
      const exSummary = gym.exercises.map((ex) => {
        const maxWeight = Math.max(...ex.sets.map((set) => set.weight));
        const totalReps = ex.sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0);
        const completedSets = ex.sets.filter((set) => set.completed).length;
        return `${ex.exerciseName}: ${completedSets}/${ex.sets.length} sets completed, max ${maxWeight}kg, ${totalReps} total reps`;
      }).join('; ');
      lines.push(`[${s.date}] Gym Session ${gym.variant} - Feeling: ${s.feeling}/5 - ${exSummary}`);
    } else if (s.data.type === 'running') {
      lines.push(`[${s.date}] Running (${s.data.variant}) - ${s.data.distance}km at ${s.data.pace}/km, HR ${s.data.avgHR}bpm, ${s.data.duration}min - Feeling: ${s.feeling}/5`);
    } else if (s.data.type === 'basketball') {
      lines.push(`[${s.date}] Basketball - ${s.data.duration}min, HR ${s.data.avgHR}bpm, ${s.data.caloriesBurned}cal - Feeling: ${s.feeling}/5`);
    }
  }

  return lines.join('\n');
}

export interface AiSuggestion {
  summary: string;
  nextSession: {
    sport: Sport;
    details: string;
    gymExercises?: { exerciseId: string; suggestedWeight: number; suggestedReps: number; suggestedSets: number }[];
    runningPace?: string;
    runningDistance?: number;
  };
  tips: string[];
}

export async function getAiCoaching(
  sessions: WorkoutSession[],
  nextSport: Sport,
  gymVariant?: 'A' | 'B'
): Promise<AiSuggestion> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key set');

  const summary = buildWorkoutSummary(sessions);

  const gymExerciseContext = nextSport === 'gym'
    ? `\nThe next gym session is variant ${gymVariant || 'A'}. Here are the exercises with their current defaults:\n` +
      (gymVariant === 'B'
        ? ['goblet-squat', 'db-incline-press', 'overhead-press', 'renegade-row', 'glute-bridge', 'bird-dog', 'ab-wheel-rollout']
        : ['deadlift', 'kettlebell-swing', 'lat-pulldown', 'seated-cable-row', 'face-pull', 'dead-bug', 'hanging-leg-raise']
      ).map((id) => {
        const ex = getExerciseById(id);
        return ex ? `- ${ex.name} (${ex.id}): ${ex.defaultSets}×${ex.defaultReps} @ ${ex.defaultWeight}${ex.unit}` : '';
      }).filter(Boolean).join('\n')
    : '';

  const prompt = `You are a personal fitness coach. Analyze this person's recent workout history and suggest the optimal next ${nextSport} session.

Goals: Build lean muscle, improve posture (anterior pelvic tilt), improve running pace, learn basketball fundamentals.
Training schedule: 2× gym (A/B split), 2× running, 2× basketball per week.

Recent workout history:
${summary}
${gymExerciseContext}

Respond in this exact JSON format (no markdown, no backticks, just JSON):
{
  "summary": "Brief analysis of recent performance (2-3 sentences)",
  "nextSession": {
    "sport": "${nextSport}",
    "details": "What to focus on in the next session"${nextSport === 'gym' ? `,
    "gymExercises": [{"exerciseId": "id", "suggestedWeight": 0, "suggestedReps": 0, "suggestedSets": 0}]` : ''}${nextSport === 'running' ? `,
    "runningPace": "m:ss",
    "runningDistance": 0` : ''}
  },
  "tips": ["tip1", "tip2", "tip3"]
}

Be specific with numbers. For gym exercises, base suggestions on progressive overload from their history. If they completed all sets/reps at a weight for 2+ sessions, suggest increasing. If they struggled, suggest staying or reducing slightly.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) throw new Error('Invalid API key');
    throw new Error(`API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonStr = text.replace(/^```json?\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(jsonStr) as AiSuggestion;
}
