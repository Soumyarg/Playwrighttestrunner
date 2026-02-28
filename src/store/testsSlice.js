import { createSlice } from '@reduxjs/toolkit';

const initialModules = [
  {
    id: 'mod-1',
    name: 'Authentication',
    expanded: true,
    suites: [
      {
        id: 'suite-1',
        name: 'Login Tests',
        tags: ['auth', 'critical'],
        expanded: true,
        tests: [
          {
            id: 'test-1',
            name: 'Valid Login Flow',
            tags: ['smoke'],
            code: `import { test, expect } from '@playwright/test';

test('valid login flow', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('https://example.com/dashboard');
  await expect(page.getByText('Welcome back')).toBeVisible();
});`,
            status: 'passed',
            lastRun: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'test-2',
            name: 'Invalid Credentials',
            tags: ['negative'],
            code: `import { test, expect } from '@playwright/test';

test('invalid credentials shows error', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('wrong@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
});`,
            status: 'failed',
            lastRun: new Date(Date.now() - 7200000).toISOString(),
          },
        ],
      },
      {
        id: 'suite-2',
        name: 'Registration Tests',
        tags: ['auth'],
        expanded: false,
        tests: [
          {
            id: 'test-3',
            name: 'New User Registration',
            tags: ['smoke', 'regression'],
            code: `import { test, expect } from '@playwright/test';

test('new user registration', async ({ page }) => {
  await page.goto('https://example.com/register');
  await page.getByLabel('Full Name').fill('Test User');
  await page.getByLabel('Email').fill('newuser@example.com');
  await page.getByLabel('Password').fill('securepass123');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Account created successfully')).toBeVisible();
});`,
            status: 'pending',
            lastRun: null,
          },
        ],
      },
    ],
  },
  {
    id: 'mod-2',
    name: 'Dashboard',
    expanded: false,
    suites: [
      {
        id: 'suite-3',
        name: 'Overview Tests',
        tags: ['dashboard'],
        expanded: false,
        tests: [
          {
            id: 'test-4',
            name: 'Dashboard Loads Correctly',
            tags: ['smoke'],
            code: `import { test, expect } from '@playwright/test';

test('dashboard overview loads', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByTestId('stats-panel')).toBeVisible();
});`,
            status: 'passed',
            lastRun: new Date(Date.now() - 1800000).toISOString(),
          },
        ],
      },
    ],
  },
];

const initialSavedTests = [
  {
    id: 'saved-1',
    name: 'Login Smoke Test',
    description: 'Quick smoke test for login functionality',
    code: `import { test, expect } from '@playwright/test';

test('login smoke test', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('https://example.com/dashboard');
});`,
    tags: ['smoke', 'auth'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'saved-2',
    name: 'Form Validation Test',
    description: 'Tests all form validation scenarios',
    code: `import { test, expect } from '@playwright/test';

test('form validation', async ({ page }) => {
  await page.goto('https://example.com/register');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Email is required')).toBeVisible();
  await expect(page.getByText('Password is required')).toBeVisible();
});`,
    tags: ['validation', 'regression'],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'saved-3',
    name: 'Navigation Test',
    description: 'Tests main navigation flow',
    code: `import { test, expect } from '@playwright/test';

test('main navigation', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL('https://example.com/about');
  await page.getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL('https://example.com/contact');
});`,
    tags: ['navigation', 'smoke'],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

const testsSlice = createSlice({
  name: 'tests',
  initialState: {
    modules: initialModules,
    savedTests: initialSavedTests,
    selectedTestId: 'test-1',
    currentCode: initialModules[0].suites[0].tests[0].code,
    framework: {
      locators: {
        login: {
          email: 'input[type="email"]',
          password: 'input[type="password"]',
          submitBtn: 'button[type="submit"]',
        },
        register: {
          fullName: 'input[name="fullName"]',
          email: 'input[name="email"]',
          password: 'input[name="password"]',
        },
        common: {
          navMenu: 'nav',
          logo: '.logo',
        },
      },
      testData: {
        users: {
          valid: { email: 'user@example.com', password: 'password123' },
          invalid: { email: 'wrong@example.com', password: 'wrongpassword' },
        },
        urls: {
          base: 'https://example.com',
          login: 'https://example.com/login',
          dashboard: 'https://example.com/dashboard',
        },
      },
    },
  },
  reducers: {
    setCurrentCode(state, action) {
      state.currentCode = action.payload;
    },
    setSelectedTest(state, action) {
      state.selectedTestId = action.payload.id;
      state.currentCode = action.payload.code;
    },
    toggleModule(state, action) {
      const mod = state.modules.find(m => m.id === action.payload);
      if (mod) mod.expanded = !mod.expanded;
    },
    toggleSuite(state, action) {
      for (const mod of state.modules) {
        const suite = mod.suites.find(s => s.id === action.payload);
        if (suite) { suite.expanded = !suite.expanded; break; }
      }
    },
    addModule(state, action) {
      state.modules.push({
        id: `mod-${Date.now()}`,
        name: action.payload.name,
        expanded: true,
        suites: [],
      });
    },
    addSuite(state, action) {
      const mod = state.modules.find(m => m.id === action.payload.moduleId);
      if (mod) {
        mod.suites.push({
          id: `suite-${Date.now()}`,
          name: action.payload.name,
          tags: action.payload.tags || [],
          expanded: true,
          tests: [],
        });
      }
    },
    addTest(state, action) {
      for (const mod of state.modules) {
        const suite = mod.suites.find(s => s.id === action.payload.suiteId);
        if (suite) {
          suite.tests.push({
            id: `test-${Date.now()}`,
            name: action.payload.name,
            tags: action.payload.tags || [],
            code: action.payload.code || '',
            status: 'pending',
            lastRun: null,
          });
          break;
        }
      }
    },
    deleteModule(state, action) {
      state.modules = state.modules.filter(m => m.id !== action.payload);
    },
    deleteSuite(state, action) {
      for (const mod of state.modules) {
        mod.suites = mod.suites.filter(s => s.id !== action.payload);
      }
    },
    deleteTest(state, action) {
      for (const mod of state.modules) {
        for (const suite of mod.suites) {
          suite.tests = suite.tests.filter(t => t.id !== action.payload);
        }
      }
    },
    updateTestStatus(state, action) {
      const { testId, status } = action.payload;
      for (const mod of state.modules) {
        for (const suite of mod.suites) {
          const test = suite.tests.find(t => t.id === testId);
          if (test) {
            test.status = status;
            test.lastRun = new Date().toISOString();
            break;
          }
        }
      }
    },
    saveSavedTest(state, action) {
      const existing = state.savedTests.find(t => t.id === action.payload.id);
      if (existing) {
        Object.assign(existing, action.payload, { updatedAt: new Date().toISOString() });
      } else {
        state.savedTests.push({
          ...action.payload,
          id: `saved-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    deleteSavedTest(state, action) {
      state.savedTests = state.savedTests.filter(t => t.id !== action.payload);
    },
    deleteSavedTests(state, action) {
      const ids = new Set(action.payload);
      state.savedTests = state.savedTests.filter(t => !ids.has(t.id));
    },
    updateFramework(state, action) {
      state.framework = { ...state.framework, ...action.payload };
    },
  },
});

export const {
  setCurrentCode, setSelectedTest, toggleModule, toggleSuite,
  addModule, addSuite, addTest, deleteModule, deleteSuite, deleteTest,
  updateTestStatus, saveSavedTest, deleteSavedTest, deleteSavedTests,
  updateFramework,
} = testsSlice.actions;
export default testsSlice.reducer;
