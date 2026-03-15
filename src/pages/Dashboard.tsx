import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { WorkoutSession, DayOfWeek, Sport } from '../data/types';
import { getSessions, getProfile } from '../data/storage';
import { generateCoachingTips, getWeekNumber, getRunningPaceTarget } from '../utils/coaching';
import { getWeekCounts, getRemaining, suggestToday } from '../utils/weekHelpers';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FEELINGS = ['😫', '😕', '😐', '🙂', '💪'];
const SPORT_EMOJI: Record<Sport, string> = { gym: '🏋️', running: '🏃', basketball: '🏀' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const profile = getProfile();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const dayName = format(today, 'EEEE') as DayOfWeek;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const weekNumber = getWeekNumber(profile.startDate);
  const tips = generateCoachingTips(sessions);
  const counts = getWeekCounts(sessions);
  const remaining = getRemaining(sessions, profile.weeklyTargets);
  const suggestion = suggestToday(sessions, profile.weeklyTargets, profile.typicalSchedule);
  const totalTarget = profile.weeklyTargets.gym + profile.weeklyTargets.running + profile.weeklyTargets.basketball;
  const totalDone = counts.gym + counts.running + counts.basketball;
  const runTarget = getRunningPaceTarget(weekNumber);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {format(today, 'EEEE, MMM d')}
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Week {weekNumber}</span>
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
    </div>
  );
}
