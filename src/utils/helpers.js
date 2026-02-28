import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function getStatusColor(status) {
  switch (status) {
    case 'passed': return 'text-green-600 dark:text-green-400';
    case 'failed': return 'text-red-600 dark:text-red-400';
    case 'running': return 'text-blue-600 dark:text-blue-400';
    case 'skipped': return 'text-gray-500 dark:text-gray-400';
    default: return 'text-yellow-600 dark:text-yellow-400';
  }
}

export function getStatusBg(status) {
  switch (status) {
    case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'skipped': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
}

export function simulateTestExecution(dispatch, { startExecution, appendLog, finishExecution, updateTestStatus }, testInfo) {
  const { testId, testName } = testInfo;
  const startTime = Date.now();

  dispatch(startExecution({ testId, testName }));

  const logs = [
    { delay: 300, type: 'info', msg: `▶  Running: ${testName}` },
    { delay: 600, type: 'dim', msg: '  ✓  Launching Chromium browser...' },
    { delay: 900, type: 'dim', msg: '  →  Navigating to URL...' },
    { delay: 1400, type: 'dim', msg: '  ✓  Page loaded successfully' },
    { delay: 1700, type: 'dim', msg: '  →  Filling form fields...' },
    { delay: 2100, type: 'dim', msg: '  ✓  Form filled' },
    { delay: 2400, type: 'dim', msg: '  →  Clicking submit button...' },
    { delay: 2700, type: 'dim', msg: '  ✓  Button clicked' },
    { delay: 3100, type: 'dim', msg: '  →  Waiting for navigation...' },
    { delay: 3500, type: 'dim', msg: '  ✓  Navigation complete' },
    { delay: 3800, type: 'dim', msg: '  →  Running assertions...' },
  ];

  logs.forEach(({ delay, type, msg }) => {
    setTimeout(() => dispatch(appendLog({ type, message: msg })), delay);
  });

  const passed = Math.random() > 0.25;
  const duration = 3800 + Math.random() * 1000;

  setTimeout(() => {
    const status = passed ? 'passed' : 'failed';
    dispatch(appendLog({
      type: passed ? 'success' : 'error',
      message: passed
        ? `  ✓  ${testName} — passed (${Math.round(duration)}ms)`
        : `  ✗  ${testName} — failed: Expected element to be visible`,
    }));
    if (testId) dispatch(updateTestStatus({ testId, status }));
    dispatch(finishExecution({
      testName,
      stats: { total: 1, passed: passed ? 1 : 0, failed: passed ? 0 : 1, skipped: 0, duration: Math.round(duration) },
    }));
  }, duration);
}
