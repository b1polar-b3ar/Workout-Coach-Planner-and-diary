import { useState } from 'react';
import { getProfile, saveProfile } from '../data/storage';
import { typicalSchedule, gymSessionA, gymSessionB, basketballDrills, runningProgression } from '../data/defaultPlan';
import { getExerciseById } from '../data/exercises';
import { getWeekNumber, getRunningPaceTarget } from '../utils/coaching';
import { DayOfWeek } from '../data/types';

const DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DetailView = 'schedule' | 'gymA' | 'gymB' | 'running' | 'basketball' | 'posture';

export default function Plan() {
  const profile = getProfile();
  const [name, setName] = useState(profile.name);
  const [view, setView] = useState<DetailView>('schedule');
  const weekNumber = getWeekNumber(profile.startDate);
  const runTarget = getRunningPaceTarget(weekNumber);

  function saveName() {
    saveProfile({ ...profile, name });
  }

  const { gym, running, basketball } = profile.weeklyTargets;

  return (
    <div className="page fade-in">
      <h1 className="page-title">Training Plan</h1>

      {/* Name */}
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Week {weekNumber}</span>
      </div>

      {/* Goals */}
      <div className="card">
        <div className="card-title">Goals</div>
        <ul style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          {profile.goals.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </div>

      {/* Weekly targets summary */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--gym)' }}>{gym}×</div>
          <div className="stat-label">Gym</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--running)' }}>{running}×</div>
          <div className="stat-label">Running</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--basketball)' }}>{basketball}×</div>
          <div className="stat-label">Basketball</div>
        </div>
      </div>

      {/* View selector */}
      <div className="scroll-x" style={{ marginBottom: 16 }}>
        {[
          { id: 'schedule' as const, label: 'Schedule' },
          { id: 'gymA' as const, label: 'Gym A' },
          { id: 'gymB' as const, label: 'Gym B' },
          { id: 'running' as const, label: 'Running' },
          { id: 'basketball' as const, label: 'Basketball' },
          { id: 'posture' as const, label: 'Posture' },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${view === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'schedule' && (
        <div className="card">
          <div className="card-title">Typical Week</div>
          <div className="tip-card" style={{ marginBottom: 12 }}>
            This is your <strong>usual</strong> layout, not a strict rule. Busy on Monday?
            Do gym on Tuesday instead — the app tracks what's remaining, not what day it is.
          </div>
          {DAYS.map((day) => {
            const s = typicalSchedule[day];
            return (
              <div key={day} className={`schedule-day ${!s ? 'rest' : ''}`}>
                <span className="day-name">{day}</span>
                <span className="day-label">
                  {s ? (
                    <>
                      <span className={`sport-badge ${s.sport}`} style={{ marginRight: 8, fontSize: 10 }}>
                        {s.sport}
                      </span>
                      {s.label}
                    </>
                  ) : (
                    'Rest & Recovery'
                  )}
                </span>
              </div>
            );
          })}
          <div className="tip-card" style={{ marginTop: 12 }}>
            <strong>{gym + running + basketball} sessions/week</strong> — gym alternates between
            Session A (pull focus) and Session B (push focus). The app auto-picks A or B based
            on which you did last.
          </div>
        </div>
      )}

      {view === 'gymA' && (
        <div className="card">
          <div className="card-title">Gym Session A — Pull Focus</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Deadlift day. Posterior chain emphasis with back & core work.
          </p>
          <ExerciseList exercises={gymSessionA} />
          <div className="tip-card" style={{ marginTop: 12 }}>
            <strong>Warmup:</strong> 5 min rope skipping<br />
            <strong>Cooldown:</strong> 5 min rowing/treadmill/elliptical
          </div>
        </div>
      )}

      {view === 'gymB' && (
        <div className="card">
          <div className="card-title">Gym Session B — Push Focus</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Squat day. Anterior chain with pressing & posture correction.
          </p>
          <ExerciseList exercises={gymSessionB} />
          <div className="tip-card" style={{ marginTop: 12 }}>
            <strong>Warmup:</strong> 5 min rope skipping<br />
            <strong>Cooldown:</strong> 5 min rowing/treadmill/elliptical
          </div>
        </div>
      )}

      {view === 'running' && (
        <div className="card">
          <div className="card-title">Running Plan</div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Solo Runs</h4>
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-value">{runningProgression.solo.currentPace}</div>
                <div className="stat-label">Current Pace</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{runTarget.pace}</div>
                <div className="stat-label">Week {weekNumber} Target</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{runTarget.distance}km</div>
                <div className="stat-label">Target Dist</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Group Runs</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Pace: ~{runningProgression.group.currentPace}/km | Distance: {runningProgression.group.currentDistance}km<br />
              {runningProgression.group.notes}
            </p>
          </div>

          <div className="tip-card">
            <strong>Progression:</strong> Aim to drop ~3 seconds per km per week on solo runs.
            Increase distance by 0.25km every 2 weeks. Don't increase pace and distance in the same week.
          </div>
        </div>
      )}

      {view === 'basketball' && (
        <div className="card">
          <div className="card-title">Basketball Plan</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Focus on fundamentals since you're just starting out. Each session ~70 min.
          </p>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Drill Menu</h4>
            {basketballDrills.map((drill, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <strong>{drill.name}</strong> ({drill.duration})
                {drill.videos.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {drill.videos.map((v, vi) => (
                      <a key={vi} href={v.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, color: 'var(--accent-light)', textDecoration: 'underline' }}>
                        ▶ {v.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="tip-card">
            Pick 3-4 drills per session. As you improve, spend more time on weak areas.
            Track your court time, HR, and calories to monitor intensity.
          </div>
        </div>
      )}

      {view === 'posture' && (
        <div className="card">
          <div className="card-title">Posture Correction Plan</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Anterior pelvic tilt (belly forward) is caused by tight hip flexors and weak glutes/abs.
            Your plan addresses this with:
          </p>

          <div className="exercise-row">
            <div className="exercise-name">Key Exercises in Your Plan</div>
            <ul style={{ paddingLeft: 20, fontSize: 13, lineHeight: 2, color: 'var(--text-secondary)' }}>
              <li><strong>Dead Bug</strong> — Teaches core bracing, flattens lower back</li>
              <li><strong>Bird Dog</strong> — Spinal stability & glute activation</li>
              <li><strong>Glute Bridge</strong> — Strengthens glutes to counter hip flexor tightness</li>
              <li><strong>Ab Wheel Rollout</strong> — Anti-extension core strength</li>
              <li><strong>Face Pull</strong> — Upper back posture, counters rounded shoulders</li>
              <li><strong>Farmer's Walk</strong> — Full-body postural endurance</li>
              <li><strong>Deadlift</strong> — Posterior chain strength</li>
              <li><strong>Kettlebell Swing</strong> — Hip hinge pattern & glute power</li>
            </ul>
          </div>

          <div className="tip-card" style={{ marginTop: 12 }}>
            <strong>Daily habits:</strong><br />
            • Stand tall — imagine a string pulling from the top of your head<br />
            • Squeeze glutes for 5 seconds every hour<br />
            • Avoid sitting for more than 45 minutes at a time<br />
            • Do 30-second hip flexor stretches morning and evening
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseList({ exercises }: { exercises: { exerciseId: string; exerciseName: string; notes: string }[] }) {
  return (
    <>
      {exercises.map((ex, i) => {
        const detail = getExerciseById(ex.exerciseId);
        return (
          <div key={ex.exerciseId} className="exercise-row">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="exercise-name">
                {i + 1}. {ex.exerciseName}
              </div>
              {detail && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {detail.defaultSets}×{detail.defaultReps}
                  {detail.defaultWeight > 0 ? ` @ ${detail.defaultWeight}kg` : ''}
                </span>
              )}
            </div>
            {detail && (
              <div className="exercise-note">
                {detail.muscleGroups.join(', ')} | {detail.notes}
              </div>
            )}
            {ex.notes && <div className="exercise-note" style={{ fontStyle: 'italic' }}>{ex.notes}</div>}
          </div>
        );
      })}
    </>
  );
}
