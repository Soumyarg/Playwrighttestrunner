import { useSelector, useDispatch } from 'react-redux';
import { useState, useRef, useEffect } from 'react';
import {
  Play, Square, Trash2, Download, RefreshCw, Terminal,
  CheckCircle2, XCircle, Clock, BarChart3, Settings, Wifi, WifiOff
} from 'lucide-react';
import { startExecution, appendLog, finishExecution, clearLogs, clearHistory } from '../../store/executionSlice';
import { updateTestStatus } from '../../store/testsSlice';
import { showNotification } from '../../store/uiSlice';
import { formatDuration, formatRelativeTime, getStatusBg, simulateTestExecution } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TestExecution() {
  const dispatch = useDispatch();
  const { isRunning, logs, stats, history } = useSelector(state => state.execution);
  const modules = useSelector(state => state.tests.modules);
  const [selectedTab, setSelectedTab] = useState('logs');
  const [browser, setBrowser] = useState('chromium');
  const [localServiceEnabled, setLocalServiceEnabled] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Gather all tests
  const allTests = [];
  modules.forEach(mod => mod.suites.forEach(suite => suite.tests.forEach(test => {
    allTests.push({ ...test, moduleName: mod.name, suiteName: suite.name });
  })));

  const passedCount = history.reduce((a, r) => a + r.passed, 0);
  const failedCount = history.reduce((a, r) => a + r.failed, 0);
  const avgDuration = history.length > 0
    ? Math.round(history.reduce((a, r) => a + r.duration, 0) / history.length)
    : 0;

  const historyChartData = history.slice(0, 10).reverse().map((r, i) => ({
    name: `#${i + 1}`,
    passed: r.passed,
    failed: r.failed,
  }));

  const handleRunAll = () => {
    if (allTests.length === 0) {
      dispatch(showNotification({ type: 'warning', message: 'No tests to run' }));
      return;
    }
    const testName = `All Tests (${allTests.length} tests)`;
    dispatch(startExecution({ testName }));
    dispatch(appendLog({ type: 'info', message: `▶  Running ${allTests.length} tests...` }));

    let completed = 0;
    let passed = 0;
    const startTime = Date.now();

    allTests.forEach((test, i) => {
      setTimeout(() => {
        const isPass = Math.random() > 0.2;
        dispatch(appendLog({
          type: isPass ? 'success' : 'error',
          message: `  ${isPass ? '✓' : '✗'}  ${test.name} (${Math.round(800 + Math.random() * 1200)}ms)`
        }));
        dispatch(updateTestStatus({ testId: test.id, status: isPass ? 'passed' : 'failed' }));
        if (isPass) passed++;
        completed++;

        if (completed === allTests.length) {
          const duration = Date.now() - startTime;
          dispatch(finishExecution({
            testName,
            stats: { total: allTests.length, passed, failed: allTests.length - passed, skipped: 0, duration },
          }));
        }
      }, i * 400 + 500);
    });
  };

  const handleRunTest = (test) => {
    simulateTestExecution(
      dispatch,
      { startExecution, appendLog, finishExecution, updateTestStatus },
      { testId: test.id, testName: test.name }
    );
  };

  const logColors = {
    success: 'log-success',
    error: 'log-error',
    warning: 'log-warning',
    info: 'log-info',
    dim: 'log-dim',
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Page Header */}
      <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground font-heading">Test Execution</h1>
          <p className="text-xs text-muted-foreground">Run and monitor your Playwright tests</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Browser Selector */}
          <select
            value={browser}
            onChange={e => setBrowser(e.target.value)}
            disabled={isRunning}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>

          <button
            onClick={() => dispatch(clearLogs())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
          >
            <Trash2 size={13} />
            Clear Logs
          </button>
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg"
          >
            {isRunning ? (
              <><RefreshCw size={14} className="animate-spin" /> Running...</>
            ) : (
              <><Play size={14} /> Run All Tests</>
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: 'Total Runs', value: history.length, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Passed', value: passedCount, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Failed', value: failedCount, icon: XCircle, color: 'text-red-600' },
          { label: 'Avg Duration', value: formatDuration(avgDuration), icon: Clock, color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card px-4 py-3 flex items-center gap-3">
            <stat.icon size={18} className={stat.color} />
            <div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Test List */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Tests ({allTests.length})</span>
          </div>
          <div className="py-1">
            {allTests.map(test => (
              <div
                key={test.id}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 cursor-pointer group"
              >
                <StatusDot status={test.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{test.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{test.suiteName}</p>
                </div>
                <button
                  onClick={() => handleRunTest(test)}
                  disabled={isRunning}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 disabled:opacity-30"
                >
                  <Play size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Logs + History */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex gap-0.5 px-3 pt-2 border-b border-border bg-card">
            {[
              { id: 'logs', label: 'Execution Logs', icon: Terminal },
              { id: 'history', label: 'Run History', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px ${
                  selectedTab === tab.id
                    ? 'text-primary border-primary bg-muted/50'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {selectedTab === 'logs' && (
              <div className="h-full flex flex-col p-4 gap-3">
                {/* Last run stats */}
                {stats.total > 0 && (
                  <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 rounded-lg border border-border text-sm">
                    <span className="text-muted-foreground">Last run:</span>
                    <span className="text-green-600 font-medium">{stats.passed} passed</span>
                    {stats.failed > 0 && <span className="text-red-600 font-medium">{stats.failed} failed</span>}
                    <span className="text-muted-foreground">{formatDuration(stats.duration)}</span>
                  </div>
                )}
                <div className="log-output flex-1">
                  {logs.length === 0 ? (
                    <span className="log-dim">// Waiting for test execution...\n// Click "Run All Tests" or run individual tests from the list.</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={logColors[log.type] || ''}>
                        <span className="log-dim">[{log.timestamp}] </span>
                        {log.message}
                        {'\n'}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {selectedTab === 'history' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {/* Chart */}
                {historyChartData.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Run History Chart</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={historyChartData} barSize={14}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)' }} />
                        <Bar dataKey="passed" fill="#22c55e" name="Passed" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* History List */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Execution History</h3>
                  <button
                    onClick={() => { if (confirm('Clear all history?')) dispatch(clearHistory()); }}
                    className="text-xs text-muted-foreground hover:text-red-600"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {history.map(run => (
                    <div key={run.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:shadow-elevation-sm transition-shadow">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{run.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.passed}/{run.total} passed · {formatDuration(run.duration)} · {formatRelativeTime(run.timestamp)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusBg(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'settings' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Execution Settings</h3>

                {/* Local Playwright Service */}
                <div className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {localServiceEnabled ? (
                        <Wifi size={16} className="text-green-500" />
                      ) : (
                        <WifiOff size={16} className="text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">Local Playwright Service</p>
                        <p className="text-xs text-muted-foreground">ws://localhost:8080</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setLocalServiceEnabled(!localServiceEnabled);
                        dispatch(showNotification({
                          type: localServiceEnabled ? 'info' : 'success',
                          message: localServiceEnabled ? 'Local service disabled' : 'Local service enabled',
                        }));
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        localServiceEnabled ? 'bg-green-500' : 'bg-border'
                      }`}
                    >
                      <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform ${
                        localServiceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div className={`text-xs px-3 py-2 rounded-md ${
                    localServiceEnabled
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {localServiceEnabled ? '✅ Connected — Real browser execution enabled' : '⚠ Disconnected — Using simulation mode'}
                  </div>
                </div>

                {/* Settings */}
                <div className="bg-card rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">General Settings</h4>
                  {[
                    { label: 'Headless mode', desc: 'Run without browser UI' },
                    { label: 'Screenshot on failure', desc: 'Auto capture on test fail' },
                    { label: 'Video recording', desc: 'Record test sessions' },
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked={i === 0} className="w-4 h-4 accent-primary" />
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">Setup Local Playwright Service</p>
                  <pre className="text-xs text-amber-700 dark:text-amber-500 mt-2 whitespace-pre font-code">
{`cd playwright-service
npm install
npx playwright install
npm start`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    running: 'bg-blue-500 animate-pulse',
    skipped: 'bg-gray-400',
    pending: 'bg-yellow-400',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-400'}`} />;
}
