import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Clock, PlayCircle, TrendingUp,
  FlaskConical, BookMarked, ArrowRight, Activity, Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatDuration, formatRelativeTime, getStatusBg } from '../../utils/helpers';

const trendData = [
  { day: 'Mon', passed: 18, failed: 2 },
  { day: 'Tue', passed: 22, failed: 1 },
  { day: 'Wed', passed: 19, failed: 3 },
  { day: 'Thu', passed: 25, failed: 0 },
  { day: 'Fri', passed: 21, failed: 2 },
  { day: 'Sat', passed: 17, failed: 1 },
  { day: 'Sun', passed: 28, failed: 0 },
];

function StatCard({ icon: Icon, label, value, sub, color, bgColor }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-elevation-sm hover:shadow-elevation-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon size={22} className={color} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const history = useSelector(state => state.execution.history);
  const modules = useSelector(state => state.tests.modules);
  const savedTests = useSelector(state => state.tests.savedTests);

  // compute stats
  let totalTests = 0, passedTests = 0, failedTests = 0;
  modules.forEach(m => m.suites.forEach(s => {
    totalTests += s.tests.length;
    s.tests.forEach(t => {
      if (t.status === 'passed') passedTests++;
      else if (t.status === 'failed') failedTests++;
    });
  }));

  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const totalRuns = history.reduce((a, r) => a + r.total, 0);
  const totalPassed = history.reduce((a, r) => a + r.passed, 0);

  const recentRuns = history.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Test automation overview and analytics</p>
        </div>
        <Link
          to="/test-execution"
          className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-elevation-sm"
        >
          <PlayCircle size={16} />
          Run Tests
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle2}
          label="Pass Rate"
          value={`${passRate}%`}
          sub={`${passedTests} of ${totalTests} tests`}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={XCircle}
          label="Failed Tests"
          value={failedTests}
          sub="Needs attention"
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-900/20"
        />
        <StatCard
          icon={Activity}
          label="Total Runs"
          value={history.length}
          sub={`${totalRuns} tests executed`}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={FlaskConical}
          label="Test Suites"
          value={modules.reduce((a, m) => a + m.suites.length, 0)}
          sub={`${modules.length} modules`}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-elevation-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Test Results Trend</h2>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="passed" stroke="#22c55e" strokeWidth={2} fill="url(#passGrad)" name="Passed" />
              <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="url(#failGrad)" name="Failed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Links */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-elevation-sm">
          <h2 className="font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="space-y-2">
            {[
              { to: '/test-orchestrator', icon: FlaskConical, label: 'Test Orchestrator', sub: 'Manage test suites', color: 'text-blue-600' },
              { to: '/test-execution', icon: PlayCircle, label: 'Run Tests', sub: 'Execute & monitor', color: 'text-green-600' },
              { to: '/saved-tests', icon: BookMarked, label: 'Saved Tests', sub: `${savedTests.length} tests saved`, color: 'text-purple-600' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Modules Overview + Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Test Modules */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-elevation-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Test Modules</h2>
            <Link to="/test-orchestrator" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {modules.map(mod => {
              const total = mod.suites.reduce((a, s) => a + s.tests.length, 0);
              const passed = mod.suites.reduce((a, s) => a + s.tests.filter(t => t.status === 'passed').length, 0);
              const failed = mod.suites.reduce((a, s) => a + s.tests.filter(t => t.status === 'failed').length, 0);
              const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
              return (
                <div key={mod.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{mod.name}</span>
                    <span className="text-xs text-muted-foreground">{total} tests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    {failed > 0 && (
                      <span className="text-xs text-red-500">{failed} failed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-elevation-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Runs</h2>
            <Link to="/test-execution" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {recentRuns.map(run => (
              <div key={run.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{run.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.passed}/{run.total} passed · {formatDuration(run.duration)} · {formatRelativeTime(run.timestamp)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBg(run.status)}`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
