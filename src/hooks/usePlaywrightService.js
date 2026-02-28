/**
 * usePlaywrightService.js
 * React hook that manages the WebSocket connection to the
 * local Playwright execution service and exposes:
 *  - connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
 *  - isRunning: bool
 *  - logs: [{type, message, timestamp}]
 *  - screenshots: [{data, label}]
 *  - lastResult: {status, duration, error} | null
 *  - connect(url)
 *  - disconnect()
 *  - runTest(testCode, options)
 *  - abortTest()
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Use the sandbox public URL so the browser can reach the service
// Falls back to localhost for local development
const SANDBOX_WS_URL = 'wss://8080-ibbuq9t7st05jn18b8red-de59bda9.sandbox.novita.ai';
const DEFAULT_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:8080'
  : SANDBOX_WS_URL;

export function usePlaywrightService() {
  const wsRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected'|'connecting'|'connected'|'error'
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [serviceUrl, setServiceUrl] = useState(DEFAULT_URL);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const appendLog = useCallback((type, message, timestamp) => {
    setLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), type, message, timestamp: timestamp || new Date().toLocaleTimeString() }
    ]);
  }, []);

  const connect = useCallback((url = DEFAULT_URL) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setServiceUrl(url);
    setConnectionStatus('connecting');
    appendLog('info', `🔌 Connecting to ${url}...`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        setConnectionStatus('error');
        appendLog('error', `❌ Connection timeout — make sure the Playwright service is running`);
        appendLog('dim', `   Run: cd playwright-service && npm start`);
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      setConnectionStatus('connected');
      appendLog('success', `✅ Connected to Playwright service at ${url}`);
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'connected':
          appendLog('success', `🎭 ${msg.message}`);
          break;

        case 'log':
          appendLog(msg.logType || 'dim', msg.message, msg.timestamp);
          break;

        case 'start':
          setIsRunning(true);
          setScreenshots([]);
          setLastResult(null);
          break;

        case 'screenshot':
          setScreenshots(prev => [...prev, { data: msg.data, label: msg.label || 'Screenshot' }]);
          appendLog('dim', `   📸 ${msg.label || 'Screenshot captured'}`);
          break;

        case 'complete':
          setIsRunning(false);
          setLastResult({ status: msg.status, duration: msg.duration, error: msg.error });
          break;

        case 'aborted':
          setIsRunning(false);
          appendLog('warning', '🛑 Test execution aborted');
          break;

        case 'error':
          setIsRunning(false);
          appendLog('error', `❌ Service error: ${msg.message}`);
          break;

        case 'pong':
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      setConnectionStatus('error');
      appendLog('error', `❌ Connection failed — service may not be running`);
      appendLog('dim', `   Start it with: cd playwright-service && npm start`);
    };

    ws.onclose = (evt) => {
      clearTimeout(timeout);
      setIsRunning(false);
      if (connectionStatus !== 'disconnected') {
        setConnectionStatus('disconnected');
        if (evt.code !== 1000) {
          appendLog('warning', `⚠ Disconnected from service (code ${evt.code})`);
        }
      }
    };
  }, [appendLog, connectionStatus]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
    appendLog('dim', '🔌 Disconnected from service');
  }, [appendLog]);

  const runTest = useCallback((testCode, options = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      appendLog('error', '❌ Not connected to Playwright service. Click "Connect" first.');
      return false;
    }
    if (!testCode?.trim()) {
      appendLog('error', '❌ No test code to run');
      return false;
    }

    setLogs([]);
    setScreenshots([]);
    setLastResult(null);

    const message = {
      type: 'execute',
      testCode,
      browserType: options.browser || 'chromium',
      headless: options.headless !== undefined ? options.headless : true,
      slowMo: options.slowMo || 0,
      viewport: options.viewport || { width: 1280, height: 720 },
      testName: options.testName || 'Test',
    };

    wsRef.current.send(JSON.stringify(message));
    appendLog('info', `▶  Sending test to service...`);
    return true;
  }, [appendLog]);

  const abortTest = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'abort' }));
    }
    setIsRunning(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setScreenshots([]);
    setLastResult(null);
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  return {
    connectionStatus,
    isRunning,
    logs,
    screenshots,
    lastResult,
    serviceUrl,
    connect,
    disconnect,
    runTest,
    abortTest,
    clearLogs,
    ping,
  };
}
