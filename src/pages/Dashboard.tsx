import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { WorkoutSession, DayOfWeek, Sport } from '../data/types';
import { getSessions, getProfile, saveProfile } from '../data/storage';
import { generateCoachingTips, getWeekNumber, getRunningPaceTarget } from '../utils/coaching';
import { getWeekCounts, getRemaining, suggestToday, getNextGymVariant } from '../utils/weekHelpers';
import { getAiCoaching, getApiKey, saveApiKey, AiSuggestion } from '../utils/aiCoach';
import { getSyncConfig, saveSyncConfig, isSyncEnabled, subscribe, disconnect } from '../data/supabase';
import { syncFromCloud } from '../data/storage';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FEELINGS = ['😫', '😕', '😐', '🙂', '💪'];
const SPORT_EMOJI: Record<Sport, string> = { gym: '🏋️', running: '🏃', basketball: '🏀' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [name, setName] = useState('');
  const [aiResult, setAiResult] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [apiKey, setApiKey] = useState(getApiKey());
  const [showApiInput, setShowApiInput] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [syncCode, setSyncCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const profile = getProfile();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const dayName = format(today, 'EEEE') as DayOfWeek;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    setSessions(getSessions());
    setName(profile.name);

    // Load sync config
    const cfg = getSyncConfig();
    setSyncUrl(cfg.url);
    setSyncKey(cfg.key);
    setSyncCode(cfg.code);

    // Pull from cloud on load if sync is configured
    if (isSyncEnabled()) {
      setSyncStatus('syncing');
      syncFromCloud().then((ok) => {
        setSyncStatus(ok ? 'done' : 'error');
        if (ok) setSessions(getSessions());
      });

      // Subscribe to real-time changes from other devices
      subscribe(() => {
        syncFromCloud().then((ok) => {
          if (ok) setSessions(getSessions());
        });
      });
    }

    return () => { disconnect(); };
  }, []);

  const weekNumber = getWeekNumber(profile.startDate);
  const tips = generateCoachingTips(sessions);
  const counts = getWeekCounts(sessions);
  const remaining = getRemaining(sessions, profile.weeklyTargets);
  const suggestion = suggestToday(sessions, profile.weeklyTargets, profile.typicalSchedule);
  const totalTarget = profile.weeklyTargets.gym + profile.weeklyTargets.running + profile.weeklyTargets.basketball;
  const totalDone = counts.gym + counts.running + counts.basketball;
  const runTarget = getRunningPaceTarget(weekNumber);

  function saveName() {
    saveProfile({ ...profile, name });
  }

  async function fetchAiCoaching() {
    if (!apiKey) {
      setShowApiInput(true);
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const sport = suggestion?.sport || 'gym';
      const variant = sport === 'gym' ? getNextGymVariant(sessions) : undefined;
      const result = await getAiCoaching(sessions, sport, variant);
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to get coaching');
    } finally {
      setAiLoading(false);
    }
  }

  function handleSaveApiKey() {
    saveApiKey(apiKey);
    setShowApiInput(false);
  }

  // Build week view from actual logs (not from fixed schedule)
  const weekDays = DAYS.map((day, i) => {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
    const logged = sessions.find((s) => s.date === date && s.completed);
    const skipped = sessions.find((s) => s.date === date && s.skipped);
    const typical = profile.typicalSchedule[day];
    return { day, date, logged, skipped, typical };
  });

  return (
    <div className="page fade-in">
      {/* Greeting + name */}
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Week {weekNumber}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {name ? `Hey ${name}` : format(today, 'EEEE, MMM d')}
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{format(today, 'MMM d')}</span>
      </div>

      {/* Suggestion for today */}
      <p className="page-subtitle">
        {suggestion
          ? `Suggested: ${suggestion.label}`
          : totalDone >= totalTarget
          ? 'All sessions done this week! Rest up.'
          : 'Pick any remaining session below'}
      </p>

      {/* Week stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{totalDone}/{totalTarget}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sessions.filter((s) => s.completed).length}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{runTarget.pace}</div>
          <div className="stat-label">Run Pace Target</div>
        </div>
      </div>

      {/* Suggested session card */}
      {suggestion && (
        <div
          className="card card-clickable"
          onClick={() => navigate('/log', { state: { date: todayStr, sport: suggestion.sport } })}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className={`sport-badge ${suggestion.sport}`}>{suggestion.sport}</span>
              <div className="card-title" style={{ marginTop: 8 }}>{suggestion.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {sessions.find((s) => s.date === todayStr)
                  ? 'View / edit session →'
                  : 'Tap to start logging →'}
              </div>
            </div>
            <div style={{ fontSize: 32 }}>{SPORT_EMOJI[suggestion.sport]}</div>
          </div>
        </div>
      )}

      {/* Remaining this week */}
      {remaining.length > 0 && (
        <div className="card">
          <div className="card-title">Still To Do This Week</div>
          {remaining.map((r) => (
            <div
              key={r.sport}
              className="schedule-day card-clickable"
              style={{ borderRadius: 8, marginBottom: 4 }}
              onClick={() => navigate('/log', { state: { date: todayStr, sport: r.sport } })}
            >
              <span className={`sport-badge ${r.sport}`} style={{ fontSize: 10 }}>{r.sport}</span>
              <span className="day-label" style={{ flex: 1, marginLeft: 8 }}>
                {r.remaining}× {r.label}
              </span>
              <span style={{ fontSize: 20 }}>{SPORT_EMOJI[r.sport]}</span>
            </div>
          ))}
          {totalDone > 0 && (
            <div className="progress-bar" style={{ marginTop: 8 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${(totalDone / totalTarget) * 100}%`,
                  background: 'var(--accent)',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Week calendar view */}
      <div className="card">
        <div className="card-title">Week at a Glance</div>
        {weekDays.map(({ day, logged, skipped, typical }) => (
          <div
            key={day}
            className="schedule-day"
            style={day === dayName ? { background: 'var(--bg-input)', borderRadius: 8 } : {}}
          >
            <span className="day-name">{day.slice(0, 3)}</span>
            <span className="day-label">
              {logged ? (
                <>
                  <span className={`sport-badge ${logged.sport}`} style={{ fontSize: 10, marginRight: 6 }}>
                    {logged.sport}
                  </span>
                  Done
                </>
              ) : typical ? (
                <span style={{ opacity: 0.5 }}>{typical.label} (usual)</span>
              ) : (
                <span style={{ opacity: 0.4 }}>Rest</span>
              )}
            </span>
            <span style={{ fontSize: 16 }}>
              {logged
                ? FEELINGS[(logged.feeling || 3) - 1]
                : skipped
                ? '⏭️'
                : day === dayName
                ? '👈'
                : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Coaching tips */}
      <div className="card-title" style={{ marginBottom: 8 }}>Coach Says</div>
      {tips.map((tip, i) => (
        <div key={i} className="tip-card">{tip}</div>
      ))}

      {/* AI Coach */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>AI Coach</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowApiInput(!showApiInput)}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              {apiKey ? 'Key set' : 'Set API Key'}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={fetchAiCoaching}
              disabled={aiLoading}
            >
              {aiLoading ? 'Thinking...' : 'Get Advice'}
            </button>
          </div>
        </div>

        {showApiInput && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="password"
              placeholder="Anthropic API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="btn btn-sm btn-success" onClick={handleSaveApiKey}>Save</button>
          </div>
        )}

        {aiError && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>
            {aiError}
          </div>
        )}

        {!aiResult && !aiLoading && !aiError && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Get personalized suggestions for your next session based on your workout history.
          </p>
        )}

        {aiResult && (
          <div>
            <div className="tip-card" style={{ marginBottom: 8 }}>
              <strong>Summary:</strong> {aiResult.summary}
            </div>
            <div className="suggestion" style={{ marginBottom: 8 }}>
              <strong>Next Session:</strong> {aiResult.nextSession.details}
              {aiResult.nextSession.gymExercises && aiResult.nextSession.gymExercises.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {aiResult.nextSession.gymExercises.map((ex) => (
                    <div key={ex.exerciseId} style={{ fontSize: 12, padding: '2px 0' }}>
                      {ex.exerciseId}: {ex.suggestedSets}x{ex.suggestedReps} @ {ex.suggestedWeight}kg
                    </div>
                  ))}
                </div>
              )}
              {aiResult.nextSession.runningPace && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Target pace: {aiResult.nextSession.runningPace}/km | Distance: {aiResult.nextSession.runningDistance}km
                </div>
              )}
            </div>
            {aiResult.tips.length > 0 && (
              <div>
                <strong style={{ fontSize: 13 }}>Tips:</strong>
                {aiResult.tips.map((tip, i) => (
                  <div key={i} className="tip-card" style={{ marginTop: 4 }}>{tip}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cloud Sync */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Cloud Sync</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSyncEnabled() && (
              <span style={{ fontSize: 11, color: syncStatus === 'done' ? 'var(--success)' : syncStatus === 'error' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'done' ? 'Synced' : syncStatus === 'error' ? 'Error' : ''}
              </span>
            )}
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowSync(!showSync)}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              {showSync ? 'Hide' : 'Setup'}
            </button>
          </div>
        </div>

        {!showSync && !isSyncEnabled() && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            Sync your workouts across devices with Supabase (free).
          </p>
        )}

        {showSync && (
          <div style={{ marginTop: 12 }}>
            <div className="input-group">
              <label className="input-label">Supabase URL</label>
              <input
                placeholder="https://abc123.supabase.co"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJI..."
                value={syncKey}
                onChange={(e) => setSyncKey(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Sync Code (same on all devices)</label>
              <input
                placeholder="my-secret-code"
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value)}
              />
            </div>
            <button
              className="btn btn-success btn-full"
              onClick={() => {
                saveSyncConfig(syncUrl, syncKey, syncCode);
                setSyncStatus('syncing');
                syncFromCloud().then((ok) => {
                  setSyncStatus(ok ? 'done' : 'error');
                  if (ok) setSessions(getSessions());
                  subscribe(() => {
                    syncFromCloud().then((ok2) => {
                      if (ok2) setSessions(getSessions());
                    });
                  });
                });
              }}
            >
              Connect & Sync
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
              Create a free project at{' '}
              <a href="https://supabase.com" target="_blank" rel="noopener" style={{ color: 'var(--accent-light)' }}>
                supabase.com
              </a>
              , then run this SQL in the SQL Editor:
              <div style={{ background: 'var(--bg-input)', padding: 8, borderRadius: 6, marginTop: 6, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
{`create table sessions (
  id uuid primary key,
  sync_code text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table profiles (
  sync_code text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table sessions
  enable row level security;
alter table profiles
  enable row level security;

create policy "sessions_all"
  on sessions for all
  using (true);
create policy "profiles_all"
  on profiles for all
  using (true);`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
