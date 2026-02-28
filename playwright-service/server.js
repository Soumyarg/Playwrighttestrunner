/**
 * Playwright WebSocket Execution Service
 * Receives test code from the React app via WebSocket,
 * executes it using real Playwright browsers,
 * and streams live results (steps, screenshots, logs) back.
 */

const { WebSocketServer, WebSocket } = require('ws');
const { chromium, firefox, webkit } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;

// ── HTTP server (health-check + WebSocket upgrade) ────────────────────────────
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'playwright-ws', port: PORT }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Playwright WebSocket Service is running\n');
  }
});

// ── WebSocket server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({
  server: httpServer,
  // Allow connections from any origin (sandbox proxy)
  verifyClient: () => true,
});

console.log(`\n🚀 Playwright WebSocket Service starting on port ${PORT}...`);

// Track active executions so we can abort them
const activeExecutions = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Date.now().toString();
  console.log(`\n[${new Date().toLocaleTimeString()}] ✅ Client connected (id=${clientId}) origin=${req.headers.origin || 'n/a'}`);

  send(ws, { type: 'connected', message: 'Connected to Playwright service', clientId });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      send(ws, { type: 'error', message: 'Invalid JSON message' });
      return;
    }

    if (msg.type === 'execute') {
      await runTest(ws, msg, clientId);
    } else if (msg.type === 'abort') {
      const exec = activeExecutions.get(clientId);
      if (exec) {
        exec.aborted = true;
        try { await exec.browser?.close(); } catch (_) {}
        activeExecutions.delete(clientId);
        send(ws, { type: 'aborted', message: 'Test execution aborted' });
        console.log(`[${clientId}] 🛑 Execution aborted`);
      }
    } else if (msg.type === 'ping') {
      send(ws, { type: 'pong' });
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Client disconnected (id=${clientId})`);
    const exec = activeExecutions.get(clientId);
    if (exec) {
      exec.aborted = true;
      try { exec.browser?.close(); } catch (_) {}
      activeExecutions.delete(clientId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[${clientId}] WebSocket error:`, err.message);
  });
});

// ── Test Execution Engine ─────────────────────────────────────────────────────
async function runTest(ws, msg, clientId) {
  const {
    testCode = '',
    browserType = 'chromium',
    headless = true,
    slowMo = 0,
    viewport = { width: 1280, height: 720 },
    testName = 'Test',
  } = msg;

  if (!testCode.trim()) {
    send(ws, { type: 'error', message: 'No test code provided' });
    return;
  }

  const execCtx = { aborted: false, browser: null };
  activeExecutions.set(clientId, execCtx);

  const startTime = Date.now();

  sendLog(ws, 'info', `▶  Starting: ${testName}`);
  sendLog(ws, 'dim',  `   Browser : ${browserType}`);
  sendLog(ws, 'dim',  `   Headless: ${headless}`);
  sendLog(ws, 'dim',  `   Slow Mo : ${slowMo}ms`);
  sendLog(ws, 'dim',  '─'.repeat(50));

  send(ws, { type: 'start', testName });

  // ── Launch browser ────────────────────────────────────────────────────────
  let browser, context, page;
  try {
    sendLog(ws, 'dim', '   Launching browser...');

    const launcher = browserType === 'firefox' ? firefox
      : browserType === 'webkit' ? webkit
      : chromium;

    browser = await launcher.launch({ headless, slowMo });
    execCtx.browser = browser;

    if (execCtx.aborted) throw new Error('ABORTED');

    context = await browser.newContext({
      viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();

    // ── Intercept console messages ──────────────────────────────────────────
    page.on('console', (m) => {
      const t = m.type() === 'error' ? 'error' : 'dim';
      sendLog(ws, t, `   [console.${m.type()}] ${m.text()}`);
    });

    page.on('pageerror', (err) => {
      sendLog(ws, 'error', `   [page error] ${err.message}`);
    });

    sendLog(ws, 'dim', '   Browser ready ✓');

    if (execCtx.aborted) throw new Error('ABORTED');

    // ── Execute the test code ─────────────────────────────────────────────
    await executeTestCode(ws, page, context, browser, testCode, execCtx);

    if (execCtx.aborted) throw new Error('ABORTED');

    const duration = Date.now() - startTime;
    sendLog(ws, 'dim', '─'.repeat(50));
    sendLog(ws, 'success', `✅  Test PASSED  (${(duration / 1000).toFixed(2)}s)`);

    send(ws, { type: 'complete', status: 'passed', duration, testName });

  } catch (err) {
    if (execCtx.aborted || err.message === 'ABORTED') {
      // already handled
    } else {
      const duration = Date.now() - startTime;
      const errMsg = err.message || String(err);
      sendLog(ws, 'dim', '─'.repeat(50));
      sendLog(ws, 'error', `❌  Test FAILED: ${errMsg}`);

      // Capture failure screenshot
      try {
        if (page && !page.isClosed()) {
          const buf = await page.screenshot({ type: 'png', fullPage: false });
          const screenshotData = `data:image/png;base64,${buf.toString('base64')}`;
          sendLog(ws, 'dim', '   📸 Screenshot captured on failure');
          send(ws, { type: 'screenshot', data: screenshotData, label: 'Failure screenshot' });
        }
      } catch (_) {}

      send(ws, { type: 'complete', status: 'failed', duration, testName, error: errMsg });
    }
  } finally {
    try { await browser?.close(); } catch (_) {}
    activeExecutions.delete(clientId);
  }
}

// ── Execute test code ──────────────────────────────────────────────────────────
async function executeTestCode(ws, page, context, browser, rawCode, execCtx) {
  // ── Step 1: Extract the test body ─────────────────────────────────────────
  let bodyCode = rawCode;

  // Strip top-level imports / requires
  bodyCode = bodyCode.replace(/^import\s+.*?from\s+['"`][^'"`]*['"`]\s*;?\s*\n?/gm, '');
  bodyCode = bodyCode.replace(/^const\s*\{[^}]*\}\s*=\s*require\s*\([^)]*\)\s*;?\s*\n?/gm, '');

  // Try to extract body from: test('name', async ({ page, ... }) => { BODY })
  const testBodyMatch = bodyCode.match(
    /test\s*\(\s*['"`][^'"`]*['"`]\s*,\s*async\s*\(\s*\{[^)]*\}\s*\)\s*=>\s*\{([\s\S]*)\}\s*\)\s*;?\s*$/
  );
  if (testBodyMatch) {
    bodyCode = testBodyMatch[1];
  } else {
    // Try: async ({ page }) => { BODY }
    const arrowMatch = bodyCode.match(/async\s*\(\s*\{[^)]*\}\s*\)\s*=>\s*\{([\s\S]*)\}\s*;?\s*$/);
    if (arrowMatch) {
      bodyCode = arrowMatch[1];
    } else {
      // Try: async (page) => { BODY }
      const simpleArrow = bodyCode.match(/async\s*\(\s*page\s*\)\s*=>\s*\{([\s\S]*)\}\s*;?\s*$/);
      if (simpleArrow) bodyCode = simpleArrow[1];
    }
  }

  // Remove any remaining import/require lines inside the body
  bodyCode = bodyCode.replace(/^\s*import\s+.*?from\s+['"`][^'"`]*['"`]\s*;?\s*\n?/gm, '');
  bodyCode = bodyCode.replace(/^\s*const\s*\{[^}]*\}\s*=\s*require\s*\([^)]*\)\s*;?\s*\n?/gm, '');

  // ── Step 2: Install page method hooks to stream live logs ─────────────────
  installHooks(ws, page, execCtx);

  // ── Step 3: Build an expect helper compatible with Playwright assertions ──
  // NOTE: We do NOT pass 'expect' as a named parameter — we inject it as a
  //       variable inside the function body using a helper object so there is
  //       NO duplicate declaration error.
  const expectHelper = buildExpect(ws, page);

  // ── Step 4: Execute via AsyncFunction (no duplicate identifiers!) ─────────
  // We inject: page, context, browser, __expect__
  // Inside the code we replace `expect(` with `__expect__(` so there is
  // no conflict with any `const expect = ...` the user might have written.
  const safeBody = bodyCode
    // Remove any `const { expect } = require(...)` or `const expect = ...` lines
    .replace(/^\s*const\s+\{?\s*expect\s*\}?\s*=\s*.*;\s*\n?/gm, '')
    // Replace standalone expect( calls with __expect__(
    .replace(/\bexpect\s*\(/g, '__expect__(');

  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const fn = new AsyncFunction('page', 'context', 'browser', '__expect__', safeBody);

  try {
    await fn(page, context, browser, expectHelper);
  } catch (err) {
    throw err;
  }

  // ── Step 5: Final screenshot ───────────────────────────────────────────────
  try {
    if (!page.isClosed()) {
      const buf = await page.screenshot({ type: 'png', fullPage: false });
      send(ws, { type: 'screenshot', data: `data:image/png;base64,${buf.toString('base64')}`, label: 'Final state' });
    }
  } catch (_) {}
}

// ── Hook page methods to stream step-by-step logs ─────────────────────────────
function installHooks(ws, page, execCtx) {
  // page.goto
  const origGoto = page.goto.bind(page);
  page.goto = async (url, opts) => {
    if (execCtx.aborted) throw new Error('ABORTED');
    sendLog(ws, 'info', `   →  goto: ${url}`);
    const result = await origGoto(url, opts);
    if (!execCtx.aborted) {
      const title = await page.title().catch(() => '');
      sendLog(ws, 'success', `   ✓  Page loaded: "${title}"`);
      try {
        const buf = await page.screenshot({ type: 'png', fullPage: false });
        send(ws, { type: 'screenshot', data: `data:image/png;base64,${buf.toString('base64')}`, label: `Navigated to ${url}` });
      } catch (_) {}
    }
    return result;
  };

  // page.click
  const origClick = page.click?.bind(page);
  if (origClick) {
    page.click = async (selector, opts) => {
      if (execCtx.aborted) throw new Error('ABORTED');
      sendLog(ws, 'info', `   →  click: ${selector}`);
      const result = await origClick(selector, opts);
      sendLog(ws, 'success', `   ✓  Clicked: ${selector}`);
      return result;
    };
  }

  // page.fill
  const origFill = page.fill?.bind(page);
  if (origFill) {
    page.fill = async (selector, value, opts) => {
      if (execCtx.aborted) throw new Error('ABORTED');
      sendLog(ws, 'info', `   →  fill: ${selector}`);
      const result = await origFill(selector, value, opts);
      sendLog(ws, 'success', `   ✓  Filled: ${selector}`);
      return result;
    };
  }

  // page.type
  const origType = page.type?.bind(page);
  if (origType) {
    page.type = async (selector, text, opts) => {
      if (execCtx.aborted) throw new Error('ABORTED');
      sendLog(ws, 'info', `   →  type: "${text.slice(0, 30)}${text.length > 30 ? '…' : ''}" into ${selector}`);
      const result = await origType(selector, text, opts);
      sendLog(ws, 'success', `   ✓  Typed`);
      return result;
    };
  }

  // page.waitForSelector
  const origWFS = page.waitForSelector?.bind(page);
  if (origWFS) {
    page.waitForSelector = async (selector, opts) => {
      if (execCtx.aborted) throw new Error('ABORTED');
      sendLog(ws, 'info', `   →  waitForSelector: ${selector}`);
      const result = await origWFS(selector, opts);
      sendLog(ws, 'success', `   ✓  Element found: ${selector}`);
      return result;
    };
  }

  // page.waitForTimeout
  const origWFT = page.waitForTimeout?.bind(page);
  if (origWFT) {
    page.waitForTimeout = async (ms) => {
      if (execCtx.aborted) throw new Error('ABORTED');
      sendLog(ws, 'dim', `   ⏳  Waiting ${ms}ms...`);
      return origWFT(ms);
    };
  }

  // page.screenshot (user-called)
  const origSS = page.screenshot?.bind(page);
  if (origSS) {
    page.screenshot = async (opts) => {
      const result = await origSS(opts);
      if (result) {
        const data = `data:image/png;base64,${result.toString('base64')}`;
        send(ws, { type: 'screenshot', data, label: opts?.path || 'User screenshot' });
        sendLog(ws, 'dim', `   📸 Screenshot taken`);
      }
      return result;
    };
  }
}

// ── Minimal expect() implementation ───────────────────────────────────────────
function buildExpect(ws, page) {
  return function __expect__(received) {
    const matchers = {
      // --- async matchers ---
      async toHaveTitle(pattern) {
        const title = await page.title();
        const ok = pattern instanceof RegExp ? pattern.test(title) : title.includes(String(pattern));
        if (!ok) throw new Error(`Expected title "${title}" to match ${pattern}`);
        sendLog(ws, 'success', `   ✓  toHaveTitle: "${title}"`);
        return matchers;
      },
      async toHaveURL(pattern) {
        const url = page.url();
        const ok = pattern instanceof RegExp ? pattern.test(url) : url.includes(String(pattern));
        if (!ok) throw new Error(`Expected URL "${url}" to match ${pattern}`);
        sendLog(ws, 'success', `   ✓  toHaveURL: ${url}`);
        return matchers;
      },
      async toBeVisible() {
        if (received && typeof received.isVisible === 'function') {
          const visible = await received.isVisible();
          if (!visible) throw new Error('Expected element to be visible');
          sendLog(ws, 'success', `   ✓  Element is visible`);
        }
        return matchers;
      },
      async toBeHidden() {
        if (received && typeof received.isHidden === 'function') {
          const hidden = await received.isHidden();
          if (!hidden) throw new Error('Expected element to be hidden');
          sendLog(ws, 'success', `   ✓  Element is hidden`);
        }
        return matchers;
      },
      async toHaveText(text) {
        if (received && typeof received.textContent === 'function') {
          const content = await received.textContent();
          const ok = text instanceof RegExp ? text.test(content) : (content || '').includes(String(text));
          if (!ok) throw new Error(`Expected text "${content}" to match ${text}`);
          sendLog(ws, 'success', `   ✓  toHaveText: "${content}"`);
        }
        return matchers;
      },
      async toHaveValue(val) {
        if (received && typeof received.inputValue === 'function') {
          const v = await received.inputValue();
          if (v !== String(val)) throw new Error(`Expected value "${v}" to equal "${val}"`);
          sendLog(ws, 'success', `   ✓  toHaveValue: "${v}"`);
        }
        return matchers;
      },
      async toContainText(text) {
        if (received && typeof received.textContent === 'function') {
          const content = await received.textContent();
          const ok = (content || '').includes(String(text));
          if (!ok) throw new Error(`Expected element text to contain "${text}", got "${content}"`);
          sendLog(ws, 'success', `   ✓  toContainText: "${text}"`);
        }
        return matchers;
      },
      // --- sync matchers ---
      toBe(expected) {
        if (received !== expected) throw new Error(`Expected ${JSON.stringify(received)} to be ${JSON.stringify(expected)}`);
        sendLog(ws, 'success', `   ✓  toBe: ${JSON.stringify(expected)}`);
        return matchers;
      },
      toBeTruthy() {
        if (!received) throw new Error(`Expected ${received} to be truthy`);
        sendLog(ws, 'success', `   ✓  toBeTruthy`);
        return matchers;
      },
      toBeFalsy() {
        if (received) throw new Error(`Expected ${received} to be falsy`);
        sendLog(ws, 'success', `   ✓  toBeFalsy`);
        return matchers;
      },
      toEqual(expected) {
        if (JSON.stringify(received) !== JSON.stringify(expected))
          throw new Error(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`);
        sendLog(ws, 'success', `   ✓  toEqual`);
        return matchers;
      },
    };

    // Support `await expect(page).toHaveTitle(...)` by making the matchers thenable-safe
    // (Playwright style: expect returns an object with async methods)
    return matchers;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (_) {}
}

function sendLog(ws, type, message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  send(ws, { type: 'log', logType: type, message, timestamp });
  console.log(`[${timestamp}] [${type.toUpperCase().padEnd(7)}] ${message}`);
}

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Playwright WebSocket Service running on ws://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Waiting for test execution requests...\n`);
});
