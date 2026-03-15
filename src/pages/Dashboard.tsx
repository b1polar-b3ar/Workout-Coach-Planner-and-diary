import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { WorkoutSession, DayOfWeek } from '../data/types';
import { getSessions, getProfile } from '../data/storage';
import { generateCoachingTips, getWeekNumber, getRunningPaceTarget } from '../utils/coaching';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FEELINGS = ['😫', '😕', '😐', '🙂', '💪'];

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

  const todaySchedule = profile.weeklySchedule[dayName];
  const weekNumber = getWeekNumber(profile.startDate);
  const tips = generateCoachingTips(sessions);

  // Week progress
  const weekSessions = DAYS.map((day, i) => {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
    const scheduled = profile.weeklySchedule[day];
    const logged = sessions.find((s) => s.date === date);
    return { day, date, scheduled, logged };
  });

  const completedCount = weekSessions.filter((ws) => ws.logged?.completed).length;
  const plannedCount = weekSessions.filter((ws) => ws.scheduled).length;

  const runTarget = getRunningPaceTarget(weekNumber);

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {format(today, 'EEEE, MMM d')}
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Week {weekNumber}</span>
      </div>
      <p className="page-subtitle">
        {todaySchedule
          ? `Today: ${todaySchedule.label}`
          : 'Rest day — recover and refuel'}
      </p>

      {/* Week overview */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{completedCount}/{plannedCount}</div>
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

      {/* Today's action */}
      {todaySchedule && (
        <div className="card card-clickable" onClick={() => navigate('/log', { state: { date: todayStr, sport: todaySchedule.sport } })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className={`sport-badge ${todaySchedule.sport}`}>{todaySchedule.sport}</span>
              <div className="card-title" style={{ marginTop: 8 }}>{todaySchedule.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {sessions.find((s) => s.date === todayStr)
                  ? 'View / edit session →'
                  : 'Tap to start logging →'}
              </div>
            </div>
            <div style={{ fontSize: 32 }}>
              {todaySchedule.sport === 'gym' ? '🏋️' : todaySchedule.sport === 'running' ? '🏃' : '🏀'}
            </div>
          </div>
        </div>
      )}

      {/* Week schedule strip */}
      <div className="card">
        <div className="card-title">This Week</div>
        {weekSessions.map(({ day, scheduled, logged }) => (
          <div
            key={day}
            className={`schedule-day ${!scheduled ? 'rest' : ''}`}
            style={day === dayName ? { background: 'var(--bg-input)', borderRadius: 8 } : {}}
          >
            <span className="day-name">{day.slice(0, 3)}</span>
            <span className="day-label">
              {scheduled ? scheduled.label : 'Rest'}
            </span>
            <span style={{ fontSize: 16 }}>
              {logged?.completed
                ? FEELINGS[(logged.feeling || 3) - 1]
                : logged?.skipped
                ? '⏭️'
                : day === dayName
                ? '👈'
                : scheduled
                ? '⬜'
                : ''}
            </span>
          </div>
        ))}
        <div className="progress-bar" style={{ marginTop: 8 }}>
          <div
            className="progress-fill"
            style={{
              width: `${(completedCount / Math.max(plannedCount, 1)) * 100}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Coaching tips */}
      <div className="card-title" style={{ marginBottom: 8 }}>Coach Says</div>
      {tips.map((tip, i) => (
        <div key={i} className="tip-card">{tip}</div>
      ))}
    </div>
  );
}
