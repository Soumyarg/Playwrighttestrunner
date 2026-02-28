import { createSlice } from '@reduxjs/toolkit';

const generateLogLine = (type, message) => ({
  id: Date.now() + Math.random(),
  type,
  message,
  timestamp: new Date().toLocaleTimeString(),
});

const executionSlice = createSlice({
  name: 'execution',
  initialState: {
    isRunning: false,
    currentTestId: null,
    results: [],
    logs: [],
    stats: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    },
    history: [
      {
        id: 'run-1',
        name: 'Login Test Suite',
        status: 'passed',
        total: 3,
        passed: 3,
        failed: 0,
        duration: 4200,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'run-2',
        name: 'Registration Tests',
        status: 'failed',
        total: 5,
        passed: 4,
        failed: 1,
        duration: 8750,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'run-3',
        name: 'Navigation Tests',
        status: 'passed',
        total: 2,
        passed: 2,
        failed: 0,
        duration: 2100,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'run-4',
        name: 'Dashboard Smoke Tests',
        status: 'passed',
        total: 6,
        passed: 6,
        failed: 0,
        duration: 12300,
        timestamp: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  },
  reducers: {
    startExecution(state, action) {
      state.isRunning = true;
      state.currentTestId = action.payload?.testId || null;
      state.logs = [
        generateLogLine('info', '🚀 Starting test execution...'),
        generateLogLine('dim', `Running: ${action.payload?.testName || 'selected tests'}`),
        generateLogLine('dim', 'Browser: Chromium'),
        generateLogLine('dim', 'Mode: Simulation'),
      ];
      state.stats = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 };
    },
    appendLog(state, action) {
      state.logs.push(generateLogLine(action.payload.type, action.payload.message));
    },
    finishExecution(state, action) {
      state.isRunning = false;
      const { stats, testName } = action.payload;
      state.stats = stats;

      const historyEntry = {
        id: `run-${Date.now()}`,
        name: testName || 'Test Run',
        status: stats.failed > 0 ? 'failed' : 'passed',
        total: stats.total,
        passed: stats.passed,
        failed: stats.failed,
        duration: stats.duration,
        timestamp: new Date().toISOString(),
      };
      state.history.unshift(historyEntry);
      if (state.history.length > 50) state.history.pop();

      state.logs.push(generateLogLine('dim', '─'.repeat(50)));
      if (stats.failed > 0) {
        state.logs.push(generateLogLine('error', `✗ ${stats.failed} test(s) failed`));
      }
      state.logs.push(generateLogLine('success', `✓ ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped`));
      state.logs.push(generateLogLine('dim', `⏱  Duration: ${(stats.duration / 1000).toFixed(2)}s`));
    },
    clearLogs(state) {
      state.logs = [];
    },
    clearHistory(state) {
      state.history = [];
    },
  },
});

export const { startExecution, appendLog, finishExecution, clearLogs, clearHistory } = executionSlice.actions;
export default executionSlice.reducer;
