import { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Play, Square, Trash2, Terminal, CheckCircle2, XCircle,
  Clock, BarChart3, Settings, Wifi, WifiOff, RefreshCw,
  Image, ChevronDown, ChevronRight, AlertCircle, Zap
} from 'lucide-react';
import { usePlaywrightService } from '../../hooks/usePlaywrightService';
import { updateTestStatus, setPendingExecution } from '../../store/testsSlice';
import { showNotification } from '../../store/uiSlice';
import {
  startExecution, appendLog as reduxAppendLog,
  finishExecution, clearHistory
} from '../../store/executionSlice';
import { formatDuration, formatRelativeTime, getStatusBg } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function TestExecution() {
  const dispatch = useDispatch();
  const { history } = useSelector(state => state.execution);
  const modules = useSelector(state => state.tests.modules);
  const currentCode = useSelector(state => state.tests.currentCode);
  const pendingExecution = useSelector(state => state.tests.pendingExecution);

  const [activeTab, setActiveTab] = useState('logs');
  const [browser, setBrowser] = useState('chromium');
  const [headless, setHeadless] = useState(true);
  const [slowMo, setSlowMo] = useState(0);
  // Detect correct WebSocket URL — use sandbox proxy URL when running in sandbox
  const defaultWsUrl = (() => {
    if (typeof window === 'undefined') return 'ws://localhost:8080';
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'ws://localhost:8080';
    // Sandbox environment: replace port 3000 with 8080 in the public URL
    return 'wss://8080-ibbuq9t7st05jn18b8red-de59bda9.sandbox.novita.ai';
  })();
  const [serviceUrl, setServiceUrlInput] = useState(defaultWsUrl);
  const [expandedScreenshot, setExpandedScreenshot] = useState(null);
  const logsEndRef = useRef(null);

  const {
    connectionStatus, isRunning, logs, screenshots, lastResult,
    connect, disconnect, runTest, abortTest, clearLogs,
  } = usePlaywrightService();

  // Handle pending execution queued from Orchestrator
  useEffect(() => {
    if (pendingExecution && connectionStatus === 'connected') {
      const started = runTest(pendingExecution.code, {
        browser, headless, slowMo,
        testName: pendingExecution.testName,
      });
      if (started) {
        dispatch(setPendingExecution(null));
        setActiveTab('logs');
        dispatch(showNotification({ type: 'info', message: `▶  Running: ${pendingExecution.testName}` }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExecution, connectionStatus]);

  // Auto-connect on mount
  useEffect(() => {
    connect(defaultWsUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sync result to Redux history
  useEffect(() => {
    if (lastResult) {
      dispatch(finishExecution({
        testName: 'Test Run',
        stats: {
          total: 1,
          passed: lastResult.status === 'passed' ? 1 : 0,
          failed: lastResult.status === 'failed' ? 1 : 0,
          skipped: 0,
          duration: lastResult.duration || 0,
        },
      }));
      dispatch(showNotification({
        type: lastResult.status === 'passed' ? 'success' : 'error',
        message: lastResult.status === 'passed'
          ? `✅ Test passed in ${formatDuration(lastResult.duration)}`
          : `❌ Test failed: ${lastResult.error?.slice(0, 60) || 'See logs'}`,
      }));
    }
  }, [lastResult]);

  // Gather all tests
  const allTests = [];
  modules.forEach(mod =>
    mod.suites.forEach(suite =>
      suite.tests.forEach(test =>
        allTests.push({ ...test, moduleName: mod.name, suiteName: suite.name })
      )
    )
  );

  const handleRunTest = (test) => {
    if (connectionStatus !== 'connected') {
      dispatch(showNotification({ type: 'warning', message: 'Connect to the Playwright service first (Settings tab)' }));
      setActiveTab('settings');
      return;
    }
    dispatch(updateTestStatus({ testId: test.id, status: 'running' }));
    const started = runTest(test.code, {
      browser, headless, slowMo,
      testName: test.name,
    });
    if (started) {
      dispatch(showNotification({ type: 'info', message: `▶  Running: ${test.name}` }));
      setActiveTab('logs');
    }
  };

  const handleRunCurrentCode = () => {
    if (connectionStatus !== 'connected') {
      dispatch(showNotification({ type: 'warning', message: 'Connect to the Playwright service first (Settings tab)' }));
      setActiveTab('settings');
      return;
    }
    if (!currentCode?.trim()) {
      dispatch(showNotification({ type: 'warning', message: 'No test code in editor. Go to Orchestrator first.' }));
      return;
    }
    runTest(currentCode, { browser, headless, slowMo, testName: 'Current Test' });
    setActiveTab('logs');
  };

  const statusConfig = {
    connected:    { color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  icon: Wifi,         label: 'Connected' },
    connecting:   { color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: RefreshCw,    label: 'Connecting...' },
    disconnected: { color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-900/20',    icon: WifiOff,      label: 'Disconnected' },
    error:        { color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',      icon: AlertCircle,  label: 'Connection Error' },
  };
  const sc = statusConfig[connectionStatus] || statusConfig.disconnected;
  const StatusIcon = sc.icon;

  const passedCount = history.reduce((a, r) => a + r.passed, 0);
  const failedCount = history.reduce((a, r) => a + r.failed, 0);
  const avgDuration = history.length > 0
    ? Math.round(history.reduce((a, r) => a + r.duration, 0) / history.length) : 0;

  const historyChartData = history.slice(0, 10).reverse().map((r, i) => ({
    name: `#${i + 1}`, passed: r.passed, failed: r.failed,
  }));

  const logColorClass = {
    success: 'text-green-400',
    error:   'text-red-400',
    warning: 'text-yellow-400',
    info:    'text-blue-400',
    dim:     'text-gray-500',
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* ── Page Header ── */}
      <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground font-heading">Test Execution</h1>
          <p className="text-xs text-muted-foreground">Real browser automation with Playwright</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Service status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
            <StatusIcon size={13} className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
            {sc.label}
          </div>

          {/* Browser selector */}
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
            onClick={() => { clearLogs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md border border-border"
          >
            <Trash2 size={13} /> Clear
          </button>

          {isRunning ? (
            <button
              onClick={abortTest}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              <Square size={14} /> Stop
            </button>
          ) : (
            <button
              onClick={handleRunCurrentCode}
              disabled={connectionStatus !== 'connected'}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              title={connectionStatus !== 'connected' ? 'Connect to service first (Settings tab)' : 'Run current test code'}
            >
              <Play size={14} /> Run Test
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: 'Total Runs',    value: history.length,          icon: BarChart3,   color: 'text-blue-600' },
          { label: 'Passed',        value: passedCount,             icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Failed',        value: failedCount,             icon: XCircle,     color: 'text-red-600' },
          { label: 'Avg Duration',  value: formatDuration(avgDuration), icon: Clock,   color: 'text-purple-600' },
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

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Test List */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Tests ({allTests.length})
            </span>
          </div>
          <div className="py-1">
            {allTests.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                No tests yet. Add them in Orchestrator.
              </p>
            ) : (
              allTests.map(test => (
                <div key={test.id}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 cursor-pointer group border-b border-border/40 last:border-0"
                >
                  <StatusDot status={test.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{test.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{test.suiteName}</p>
                  </div>
                  <button
                    onClick={() => handleRunTest(test)}
                    disabled={isRunning}
                    title="Run this test"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-30 transition-opacity"
                  >
                    <Play size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex gap-0.5 px-3 pt-2 border-b border-border bg-card">
            {[
              { id: 'logs',       label: 'Live Logs',      icon: Terminal },
              { id: 'screenshots',label: 'Screenshots',     icon: Image },
              { id: 'history',    label: 'Run History',     icon: BarChart3 },
              { id: 'settings',   label: 'Service Setup',   icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-primary bg-muted/50'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
                {tab.id === 'screenshots' && screenshots.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full leading-none">
                    {screenshots.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">

            {/* ── Logs Tab ── */}
            {activeTab === 'logs' && (
              <div className="h-full flex flex-col p-4 gap-3">
                {/* Last result banner */}
                {lastResult && (
                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium ${
                    lastResult.status === 'passed'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }`}>
                    {lastResult.status === 'passed'
                      ? <CheckCircle2 size={16} />
                      : <XCircle size={16} />}
                    {lastResult.status === 'passed'
                      ? `✅ Test PASSED in ${formatDuration(lastResult.duration)}`
                      : `❌ Test FAILED — ${lastResult.error?.slice(0, 80) || 'Unknown error'}`}
                  </div>
                )}

                {/* Log terminal */}
                <div className="log-output flex-1 font-code text-xs">
                  {logs.length === 0 ? (
                    <span className="text-gray-500">
{`// Logs will stream here when a test runs
//
// To get started:
//  1. Go to "Service Setup" tab → click Connect
//  2. Select a test from the list (left panel) and click ▶
//  3. Or click "Run Test" button (top right) to run current code`}
                    </span>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="leading-relaxed">
                        <span className="text-gray-600">[{log.timestamp}] </span>
                        <span className={logColorClass[log.type] || 'text-gray-400'}>
                          {log.message}
                        </span>
                        {'\n'}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* ── Screenshots Tab ── */}
            {activeTab === 'screenshots' && (
              <div className="h-full overflow-y-auto p-4">
                {screenshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Image size={40} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">No screenshots yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Screenshots are captured automatically when tests run
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">{screenshots.length} screenshot(s) captured</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {screenshots.map((ss, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card rounded-xl border border-border overflow-hidden shadow-elevation-sm hover:shadow-elevation-md transition-shadow"
                        >
                          <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{ss.label}</span>
                            <span className="text-xs text-muted-foreground">#{i + 1}</span>
                          </div>
                          <div
                            className="cursor-zoom-in"
                            onClick={() => setExpandedScreenshot(expandedScreenshot === i ? null : i)}
                          >
                            <img
                              src={ss.data}
                              alt={ss.label}
                              className="w-full object-contain max-h-64 bg-gray-900"
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === 'history' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {historyChartData.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Run History</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={historyChartData} barSize={14}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-card)' }} />
                        <Bar dataKey="passed" fill="#22c55e" name="Passed" radius={[3,3,0,0]} />
                        <Bar dataKey="failed"  fill="#ef4444" name="Failed"  radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">All Runs</h3>
                  <button
                    onClick={() => { if (confirm('Clear all history?')) dispatch(clearHistory()); }}
                    className="text-xs text-muted-foreground hover:text-red-600"
                  >Clear all</button>
                </div>

                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No runs yet</p>
                  ) : (
                    history.map(run => (
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
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Settings Tab ── */}
            {activeTab === 'settings' && (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {/* Connection Panel */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Playwright Service Connection</h3>
                  </div>

                  {/* Status */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    connectionStatus === 'connected'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : connectionStatus === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-muted border-border'
                  }`}>
                    <StatusIcon size={18} className={`${sc.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                    <div>
                      <p className={`text-sm font-medium ${sc.color}`}>{sc.label}</p>
                      {connectionStatus === 'connected' && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Real browser execution enabled ✓
                        </p>
                      )}
                      {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                        <p className="text-xs text-muted-foreground">
                          Start the service then click Connect
                        </p>
                      )}
                    </div>
                  </div>

                  {/* URL Input + Connect/Disconnect */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={serviceUrl}
                      onChange={e => setServiceUrlInput(e.target.value)}
                      disabled={connectionStatus === 'connected'}
                      placeholder="ws://localhost:8080"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 font-code"
                    />
                    {connectionStatus === 'connected' ? (
                      <button
                        onClick={disconnect}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connect(serviceUrl)}
                        disabled={connectionStatus === 'connecting'}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
                      >
                        {connectionStatus === 'connecting' ? (
                          <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
                        ) : (
                          <><Wifi size={14} /> Connect</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Browser Settings */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Browser Settings</h3>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm text-foreground">Browser</p>
                      <p className="text-xs text-muted-foreground">Which browser to use</p>
                    </div>
                    <select
                      value={browser}
                      onChange={e => setBrowser(e.target.value)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="chromium">Chromium</option>
                      <option value="firefox">Firefox</option>
                      <option value="webkit">WebKit</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm text-foreground">Headless mode</p>
                      <p className="text-xs text-muted-foreground">Run without visible browser window</p>
                    </div>
                    <button
                      onClick={() => setHeadless(!headless)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${headless ? 'bg-primary' : 'bg-border'}`}
                    >
                      <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 shadow transition-transform ${headless ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm text-foreground">Slow motion</p>
                      <p className="text-xs text-muted-foreground">Delay between actions (ms)</p>
                    </div>
                    <select
                      value={slowMo}
                      onChange={e => setSlowMo(Number(e.target.value))}
                      className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={0}>Off</option>
                      <option value={100}>100ms</option>
                      <option value={300}>300ms</option>
                      <option value={500}>500ms</option>
                      <option value={1000}>1000ms</option>
                    </select>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    🚀 How to Start the Service
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Open a terminal and run these commands once:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 space-y-1">
                    {[
                      'cd playwright-service',
                      'npm install',
                      'npx playwright install chromium',
                      'node server.js',
                    ].map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-green-400 font-code text-xs select-none">$</span>
                        <code className="text-gray-200 text-xs font-code">{cmd}</code>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You should see: <code className="text-green-500 font-code">✅ Playwright WebSocket Service running on ws://localhost:8080</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Then click <strong>Connect</strong> above and start running tests!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded screenshot modal */}
      <AnimatePresence>
        {expandedScreenshot !== null && screenshots[expandedScreenshot] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setExpandedScreenshot(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={screenshots[expandedScreenshot].data}
              alt={screenshots[expandedScreenshot].label}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = {
    passed:  'bg-green-500',
    failed:  'bg-red-500',
    running: 'bg-blue-500 animate-pulse',
    skipped: 'bg-gray-400',
    pending: 'bg-yellow-400',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-400'}`} />;
}
