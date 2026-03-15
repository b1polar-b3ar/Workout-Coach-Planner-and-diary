import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  WorkoutSession,
  GymSession,
  RunningSession,
  BasketballSession,
  ExerciseLog,
  ExerciseSet,
  Sport,
} from '../data/types';
import { gymSessionA, gymSessionB, basketballDrills } from '../data/defaultPlan';
import { getSessions, saveSession } from '../data/storage';
import { createDefaultSets, getProgressionSuggestion } from '../utils/coaching';
import { getNextGymVariant } from '../utils/weekHelpers';

const FEELINGS: [string, number][] = [
  ['😫', 1], ['😕', 2], ['😐', 3], ['🙂', 4], ['💪', 5],
];

export default function LogWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { date?: string; sport?: Sport } | null;

  const today = format(new Date(), 'yyyy-MM-dd');

  const [date, setDate] = useState(state?.date || today);
  const [sport, setSport] = useState<Sport>(state?.sport || 'gym');
  const [gymVariant, setGymVariant] = useState<'A' | 'B'>('A');
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Gym state
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [warmupDone, setWarmupDone] = useState(false);
  const [cooldownDone, setCooldownDone] = useState(false);
  const [cooldownActivity, setCooldownActivity] = useState('rowing-machine');

  // Running state
  const [runVariant, setRunVariant] = useState<'solo' | 'group'>('solo');
  const [distance, setDistance] = useState(7);
  const [pace, setPace] = useState('5:45');
  const [avgHR, setAvgHR] = useState(155);
  const [duration, setDuration] = useState(40);

  // Basketball state
  const [bbDuration, setBbDuration] = useState(70);
  const [bbHR, setBbHR] = useState(129);
  const [bbCalories, setBbCalories] = useState(662);
  const [bbDrills, setBbDrills] = useState<string[]>([]);

  const allSessions = getSessions();

  // Initialize exercises from template
  useEffect(() => {
    // Check if there's an existing session for this date + sport
    const existing = allSessions.find((s) => s.date === date && s.sport === sport);
    if (existing) {
      setFeeling(existing.feeling);
      if (existing.data.type === 'gym') {
        setExercises(existing.data.exercises);
        setWarmupDone(existing.data.warmup.completed);
        setCooldownDone(existing.data.cooldown.completed);
        setGymVariant(existing.data.variant || 'A');
      } else if (existing.data.type === 'running') {
        setRunVariant(existing.data.variant);
        setDistance(existing.data.distance);
        setPace(existing.data.pace);
        setAvgHR(existing.data.avgHR);
        setDuration(existing.data.duration);
        setNotes(existing.data.notes);
      } else if (existing.data.type === 'basketball') {
        setBbDuration(existing.data.duration);
        setBbHR(existing.data.avgHR);
        setBbCalories(existing.data.caloriesBurned);
        setBbDrills(existing.data.drills);
        setNotes(existing.data.notes);
      }
      return;
    }

    if (sport === 'gym') {
      // Pick A or B based on what was done this week
      const variant = getNextGymVariant(allSessions);
      setGymVariant(variant);
      const template = variant === 'A' ? gymSessionA : gymSessionB;
      setExercises(
        template.map((t) => ({
          ...t,
          sets: createDefaultSets(t.exerciseId),
        }))
      );
    } else if (sport === 'basketball') {
      setBbDrills(basketballDrills.slice(0, 4));
    }
  }, [sport, date]);

  function switchGymVariant(v: 'A' | 'B') {
    setGymVariant(v);
    const template = v === 'A' ? gymSessionA : gymSessionB;
    setExercises(
      template.map((t) => ({
        ...t,
        sets: createDefaultSets(t.exerciseId),
      }))
    );
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof ExerciseSet, value: number | boolean) {
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.map((s, i) =>
          i === setIdx ? { ...s, [field]: value } : s
        ),
      };
      return next;
    });
  }

  function addSet(exIdx: number) {
    setExercises((prev) => {
      const next = [...prev];
      const lastSet = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, { ...lastSet, completed: false }],
      };
      return next;
    });
  }

  function handleSave(skipped = false) {
    let data: GymSession | RunningSession | BasketballSession;

    if (sport === 'gym') {
      data = {
        type: 'gym',
        variant: gymVariant,
        warmup: { completed: warmupDone, duration: 5, activity: 'Rope skipping' },
        exercises,
        cooldown: { completed: cooldownDone, duration: 5, activity: cooldownActivity },
      };
    } else if (sport === 'running') {
      data = {
        type: 'running',
        variant: runVariant,
        distance,
        pace,
        avgHR,
        duration,
        notes,
      };
    } else {
      data = {
        type: 'basketball',
        duration: bbDuration,
        avgHR: bbHR,
        caloriesBurned: bbCalories,
        drills: bbDrills,
        notes,
      };
    }

    const existing = allSessions.find((s) => s.date === date && s.sport === sport);

    const session: WorkoutSession = {
      id: existing?.id || uuid(),
      date,
      sport,
      data,
      completed: !skipped,
      skipped,
      feeling,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    saveSession(session);
    setSaved(true);
    setTimeout(() => navigate('/'), 800);
  }

  if (saved) {
    return (
      <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2>Session Saved!</h2>
        <p className="page-subtitle">Great work. Keep it up!</p>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <h1 className="page-title">Log Workout</h1>

      {/* Date & Sport */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label">Sport</label>
          <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
            <option value="gym">Gym</option>
            <option value="running">Running</option>
            <option value="basketball">Basketball</option>
          </select>
        </div>
      </div>

      {/* GYM FORM */}
      {sport === 'gym' && (
        <>
          {/* A/B variant selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              className={`btn btn-sm btn-full ${gymVariant === 'A' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchGymVariant('A')}
            >
              Session A (Pull)
            </button>
            <button
              className={`btn btn-sm btn-full ${gymVariant === 'B' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchGymVariant('B')}
            >
              Session B (Push)
            </button>
          </div>

          {/* Warmup */}
          <div className="exercise-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="exercise-name">🔥 Warmup — Rope Skipping</div>
                <div className="exercise-note">5 minutes</div>
              </div>
              <button
                className={`set-check ${warmupDone ? 'done' : ''}`}
                onClick={() => setWarmupDone(!warmupDone)}
              >
                {warmupDone ? '✓' : ''}
              </button>
            </div>
          </div>

          {/* Exercises */}
          {exercises.map((ex, exIdx) => {
            const suggestion = getProgressionSuggestion(ex.exerciseId, allSessions);
            return (
              <div key={ex.exerciseId} className="exercise-row">
                <div className="exercise-name">{ex.exerciseName}</div>
                {ex.notes && <div className="exercise-note">{ex.notes}</div>}
                {suggestion && <div className="suggestion">{suggestion}</div>}

                <div className="sets-grid">
                  <span className="label">Set</span>
                  <span className="label">Weight</span>
                  <span className="label">Reps</span>
                  <span />
                  {ex.sets.map((set, setIdx) => (
                    <SetRow
                      key={setIdx}
                      setNum={setIdx + 1}
                      set={set}
                      onChange={(field, val) => updateSet(exIdx, setIdx, field, val)}
                    />
                  ))}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 6, fontSize: 11 }}
                  onClick={() => addSet(exIdx)}
                >
                  + Add Set
                </button>
              </div>
            );
          })}

          {/* Cooldown */}
          <div className="exercise-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="exercise-name">🧊 Cooldown</div>
                <select
                  value={cooldownActivity}
                  onChange={(e) => setCooldownActivity(e.target.value)}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: 12, marginTop: 4 }}
                >
                  <option value="rowing-machine">Rowing Machine</option>
                  <option value="incline-treadmill">Incline Treadmill</option>
                  <option value="elliptical">Elliptical</option>
                </select>
              </div>
              <button
                className={`set-check ${cooldownDone ? 'done' : ''}`}
                onClick={() => setCooldownDone(!cooldownDone)}
              >
                {cooldownDone ? '✓' : ''}
              </button>
            </div>
          </div>
        </>
      )}

      {/* RUNNING FORM */}
      {sport === 'running' && (
        <>
          <div className="input-group">
            <label className="input-label">Type</label>
            <select value={runVariant} onChange={(e) => {
              const v = e.target.value as 'solo' | 'group';
              setRunVariant(v);
              if (v === 'solo') { setPace('5:45'); setAvgHR(155); }
              else { setPace('6:32'); setAvgHR(147); }
            }}>
              <option value="solo">Solo Run</option>
              <option value="group">Group Run</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Distance (km)</label>
              <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(+e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Pace (min/km)</label>
              <input type="text" value={pace} onChange={(e) => setPace(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Avg HR</label>
              <input type="number" value={avgHR} onChange={(e) => setAvgHR(+e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any issues?" />
          </div>
        </>
      )}

      {/* BASKETBALL FORM */}
      {sport === 'basketball' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Duration (min)</label>
              <input type="number" value={bbDuration} onChange={(e) => setBbDuration(+e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Avg HR</label>
              <input type="number" value={bbHR} onChange={(e) => setBbHR(+e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Calories Burned</label>
            <input type="number" value={bbCalories} onChange={(e) => setBbCalories(+e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Drills / Activities</label>
            {basketballDrills.map((drill) => (
              <label key={drill} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={bbDrills.includes(drill)}
                  onChange={(e) => {
                    if (e.target.checked) setBbDrills([...bbDrills, drill]);
                    else setBbDrills(bbDrills.filter((d) => d !== drill));
                  }}
                  style={{ width: 'auto' }}
                />
                {drill}
              </label>
            ))}
          </div>
          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you work on?" />
          </div>
        </>
      )}

      {/* Feeling */}
      <div style={{ marginTop: 16 }}>
        <label className="input-label" style={{ textAlign: 'center' }}>How did you feel?</label>
        <div className="feeling-row">
          {FEELINGS.map(([emoji, val]) => (
            <button
              key={val}
              className={`feeling-btn ${feeling === val ? 'selected' : ''}`}
              onClick={() => setFeeling(val as 1 | 2 | 3 | 4 | 5)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary btn-full" onClick={() => handleSave(false)}>
          Save Session ✓
        </button>
      </div>
      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: 8 }}
        onClick={() => handleSave(true)}
      >
        Skip This Session
      </button>
    </div>
  );
}

function SetRow({
  setNum,
  set,
  onChange,
}: {
  setNum: number;
  set: ExerciseSet;
  onChange: (field: keyof ExerciseSet, val: number | boolean) => void;
}) {
  return (
    <>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{setNum}</span>
      <input
        type="number"
        step="0.5"
        value={set.weight}
        onChange={(e) => onChange('weight', +e.target.value)}
      />
      <input
        type="number"
        value={set.reps}
        onChange={(e) => onChange('reps', +e.target.value)}
      />
      <button
        className={`set-check ${set.completed ? 'done' : ''}`}
        onClick={() => onChange('completed', !set.completed)}
      >
        {set.completed ? '✓' : ''}
      </button>
    </>
  );
}
