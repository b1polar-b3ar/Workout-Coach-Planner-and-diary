import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, differenceInDays } from 'date-fns';
import { WorkoutSession, Sport } from '../data/types';
import { getSessions, getProfile } from '../data/storage';
import { getExerciseById } from '../data/exercises';
import { getProgressionSuggestion } from '../utils/coaching';

type Tab = 'overview' | 'gym' | 'running' | 'trends';

const SPORT_COLORS: Record<Sport, string> = { gym: '#6c5ce7', running: '#00b894', basketball: '#e17055' };

export default function Progress() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedExercise, setSelectedExercise] = useState('deadlift');
  const profile = getProfile();

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const completedSessions = sessions.filter((s) => s.completed);
  const gymSessions = sessions.filter((s) => s.sport === 'gym' && s.completed);
  const runningSessions = sessions.filter((s) => s.sport === 'running' && s.completed);
  const basketballSessions = sessions.filter((s) => s.sport === 'basketball' && s.completed);

  // Weekly volume data
  const now = new Date();
  const weeksBack = 8;
  const weekStarts = eachWeekOfInterval(
    { start: subWeeks(now, weeksBack), end: now },
    { weekStartsOn: 1 }
  );

  const weeklyData = weekStarts.map((ws) => {
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    const weekLabel = format(ws, 'MMM d');
    const weekSessions = sessions.filter(
      (s) => s.date >= format(ws, 'yyyy-MM-dd') && s.date <= format(we, 'yyyy-MM-dd') && s.completed
    );
    const feelings = weekSessions.map((s) => s.feeling).filter(Boolean);
    const avgFeeling = feelings.length > 0 ? Math.round((feelings.reduce((a, b) => a + b, 0) / feelings.length) * 10) / 10 : 0;
    return {
      week: weekLabel,
      gym: weekSessions.filter((s) => s.sport === 'gym').length,
      running: weekSessions.filter((s) => s.sport === 'running').length,
      basketball: weekSessions.filter((s) => s.sport === 'basketball').length,
      total: weekSessions.length,
      avgFeeling,
    };
  });

  // Feeling over time data
  const feelingData = completedSessions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: format(new Date(s.date), 'MMM d'),
      feeling: s.feeling,
      sport: s.sport,
    }));

  // Sport distribution
  const sportDistribution = [
    { name: 'Gym', value: gymSessions.length, color: SPORT_COLORS.gym },
    { name: 'Running', value: runningSessions.length, color: SPORT_COLORS.running },
    { name: 'Basketball', value: basketballSessions.length, color: SPORT_COLORS.basketball },
  ].filter((s) => s.value > 0);

  // Current streak
  function calculateStreak() {
    const sorted = completedSessions.sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return 0;
    let streak = 0;
    const uniqueDates = [...new Set(sorted.map((s) => s.date))].sort((a, b) => b.localeCompare(a));
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedStr = format(expected, 'yyyy-MM-dd');
      if (uniqueDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Weeks active
  function weeksActive() {
    if (completedSessions.length === 0) return 0;
    const earliest = completedSessions.reduce((min, s) => s.date < min ? s.date : min, completedSessions[0].date);
    return Math.max(1, Math.ceil(differenceInDays(now, new Date(earliest)) / 7));
  }

  // Exercise progression data
  function getExerciseHistory(exerciseId: string) {
    const data: { date: string; weight: number; totalReps: number }[] = [];
    for (const session of gymSessions) {
      if (session.data.type !== 'gym') continue;
      const log = session.data.exercises.find((e) => e.exerciseId === exerciseId);
      if (!log) continue;
      const maxWeight = Math.max(...log.sets.map((s) => s.weight));
      const totalReps = log.sets.reduce((sum, s) => sum + (s.completed ? s.reps : 0), 0);
      data.push({
        date: format(new Date(session.date), 'MMM d'),
        weight: maxWeight,
        totalReps,
      });
    }
    return data;
  }

  // Running progression data
  function getRunningHistory() {
    return runningSessions
      .filter((s) => s.data.type === 'running')
      .map((s) => {
        const d = s.data as { pace: string; distance: number; avgHR: number };
        const [min, sec] = d.pace.split(':').map(Number);
        return {
          date: format(new Date(s.date), 'MMM d'),
          paceSeconds: min * 60 + sec,
          distance: d.distance,
          hr: d.avgHR,
          paceLabel: d.pace,
        };
      });
  }

  // Tracked gym exercises for dropdown
  const trackedExercises = new Set<string>();
  gymSessions.forEach((s) => {
    if (s.data.type === 'gym') {
      s.data.exercises.forEach((e) => trackedExercises.add(e.exerciseId));
    }
  });

  const exerciseHistory = getExerciseHistory(selectedExercise);
  const runHistory = getRunningHistory();
  const suggestion = getProgressionSuggestion(selectedExercise, sessions);

  return (
    <div className="page fade-in">
      <h1 className="page-title">Progress</h1>

      {/* Tab bar */}
      <div className="scroll-x" style={{ marginBottom: 16 }}>
        {(['overview', 'trends', 'gym', 'running'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? 'Overview' : t === 'trends' ? 'Trends' : t === 'gym' ? 'Gym' : 'Running'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-value">{sessions.filter((s) => s.completed).length}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{gymSessions.length}</div>
              <div className="stat-label">Gym</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{runningSessions.length}</div>
              <div className="stat-label">Runs</div>
            </div>
          </div>

          {/* Weekly consistency chart */}
          <div className="card">
            <div className="card-title">Weekly Consistency</div>
            <div className="chart-container">
              <ResponsiveContainer>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                  />
                  <Bar dataKey="gym" stackId="a" fill="#6c5ce7" name="Gym" />
                  <Bar dataKey="running" stackId="a" fill="#00b894" name="Running" />
                  <Bar dataKey="basketball" stackId="a" fill="#e17055" name="Basketball" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progression suggestions */}
          {gymSessions.length > 0 && (
            <div className="card">
              <div className="card-title">Progression Suggestions</div>
              {Array.from(trackedExercises).map((exId) => {
                const s = getProgressionSuggestion(exId, sessions);
                if (!s) return null;
                return (
                  <div key={exId} className="suggestion" style={{ marginTop: 8 }}>
                    {s}
                  </div>
                );
              })}
              {Array.from(trackedExercises).every(
                (exId) => !getProgressionSuggestion(exId, sessions)
              ) && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Keep logging sessions — suggestions will appear after consistent performance.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'trends' && (
        <>
          {/* Key metrics */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-value">{calculateStreak()}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{weeksActive()}</div>
              <div className="stat-label">Weeks Active</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {completedSessions.length > 0
                  ? (completedSessions.reduce((sum, s) => sum + s.feeling, 0) / completedSessions.length).toFixed(1)
                  : '-'}
              </div>
              <div className="stat-label">Avg Feeling</div>
            </div>
          </div>

          {/* Sport distribution pie chart */}
          {sportDistribution.length > 0 && (
            <div className="card">
              <div className="card-title">Sport Distribution</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={sportDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                      >
                        {sportDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  {sportDistribution.map((s) => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{s.value} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feeling trend */}
          {feelingData.length > 0 && (
            <div className="card">
              <div className="card-title">Feeling Over Time</div>
              <div className="chart-container">
                <ResponsiveContainer>
                  <AreaChart data={feelingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                      formatter={(val: unknown) => {
                        const v = Number(val);
                        const labels = ['', 'Terrible', 'Rough', 'Okay', 'Good', 'Great'];
                        return `${v}/5 (${labels[v]})`;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="feeling"
                      stroke="#a29bfe"
                      fill="#6c5ce722"
                      strokeWidth={2}
                      dot={{ fill: '#a29bfe', r: 3 }}
                      name="Feeling"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Weekly volume trend */}
          <div className="card">
            <div className="card-title">Weekly Volume Trend</div>
            <div className="chart-container">
              <ResponsiveContainer>
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#a29bfe" fill="#6c5ce722" strokeWidth={2} name="Total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg feeling per week */}
          {weeklyData.some((w) => w.avgFeeling > 0) && (
            <div className="card">
              <div className="card-title">Weekly Avg Feeling</div>
              <div className="chart-container">
                <ResponsiveContainer>
                  <LineChart data={weeklyData.filter((w) => w.avgFeeling > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                    <Tooltip
                      contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="avgFeeling" stroke="#fdcb6e" strokeWidth={2} dot={{ fill: '#fdcb6e', r: 4 }} name="Feeling" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {completedSessions.length === 0 && (
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                No sessions logged yet. Start working out to see your trends!
              </p>
            </div>
          )}
        </>
      )}

      {tab === 'gym' && (
        <>
          <div className="input-group">
            <label className="input-label">Exercise</label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
            >
              {Array.from(trackedExercises).map((exId) => (
                <option key={exId} value={exId}>
                  {getExerciseById(exId)?.name || exId}
                </option>
              ))}
              {trackedExercises.size === 0 && (
                <option value="deadlift">Deadlift (no data yet)</option>
              )}
            </select>
          </div>

          {suggestion && <div className="suggestion">{suggestion}</div>}

          {exerciseHistory.length > 0 ? (
            <>
              <div className="card">
                <div className="card-title">Weight Progression</div>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <LineChart data={exerciseHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} unit="kg" />
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#6c5ce7"
                        strokeWidth={2}
                        dot={{ fill: '#6c5ce7', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Total Reps per Session</div>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <BarChart data={exerciseHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                      />
                      <Bar dataKey="totalReps" fill="#a29bfe" name="Reps" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                No gym data yet. Log your first session to start tracking!
              </p>
            </div>
          )}
        </>
      )}

      {tab === 'running' && (
        <>
          {runHistory.length > 0 ? (
            <>
              <div className="card">
                <div className="card-title">Pace Trend (min/km)</div>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <LineChart data={runHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#9aa0a6' }}
                        domain={['dataMin - 10', 'dataMax + 10']}
                        tickFormatter={(v) =>
                          `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`
                        }
                        reversed
                      />
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                        formatter={(val: unknown) => {
                          const v = Number(val);
                          return `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="paceSeconds"
                        stroke="#00b894"
                        strokeWidth={2}
                        dot={{ fill: '#00b894', r: 4 }}
                        name="Pace"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Distance</div>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <LineChart data={runHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} unit="km" />
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="distance"
                        stroke="#00b894"
                        strokeWidth={2}
                        dot={{ fill: '#00b894', r: 4 }}
                        name="km"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Heart Rate</div>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <LineChart data={runHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} unit=" bpm" />
                      <Tooltip
                        contentStyle={{ background: '#1a1d27', border: '1px solid #2d3139', borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="hr"
                        stroke="#e17055"
                        strokeWidth={2}
                        dot={{ fill: '#e17055', r: 4 }}
                        name="HR"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                No running data yet. Log your first run to start tracking!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
