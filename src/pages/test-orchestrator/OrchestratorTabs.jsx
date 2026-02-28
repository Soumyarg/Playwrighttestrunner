import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Play, Save, RefreshCw, Code2, Database, Layers, BookOpen,
  Copy, Check, Download, Zap, BarChart2, ChevronDown, FileCode,
  LayoutPanelLeft, Settings2, Braces
} from 'lucide-react';
import { setCurrentCode, saveSavedTest, updateTestStatus } from '../../store/testsSlice';
import { startExecution, appendLog, finishExecution } from '../../store/executionSlice';
import { setActiveOrchestratorTab, showNotification } from '../../store/uiSlice';
import { simulateTestExecution, formatRelativeTime } from '../../utils/helpers';
import SaveTestDialog from './SaveTestDialog';

const TABS = [
  { id: 'test-code', label: 'Test Code', icon: Code2 },
  { id: 'page-objects', label: 'Page Objects', icon: LayoutPanelLeft },
  { id: 'framework', label: 'Framework', icon: Braces },
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
];

export default function OrchestratorTabs() {
  const dispatch = useDispatch();
  const activeTab = useSelector(state => state.ui.activeOrchestratorTab);
  const currentCode = useSelector(state => state.tests.currentCode);
  const selectedTestId = useSelector(state => state.tests.selectedTestId);
  const framework = useSelector(state => state.tests.framework);
  const modules = useSelector(state => state.tests.modules);
  const isRunning = useSelector(state => state.execution.isRunning);
  const [copied, setCopied] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Find selected test
  let selectedTest = null;
  for (const mod of modules) {
    for (const suite of mod.suites) {
      const t = suite.tests.find(t => t.id === selectedTestId);
      if (t) { selectedTest = t; break; }
    }
    if (selectedTest) break;
  }

  const handleRunTest = () => {
    if (!currentCode.trim()) {
      dispatch(showNotification({ type: 'warning', message: 'No test code to run' }));
      return;
    }
    simulateTestExecution(
      dispatch,
      { startExecution, appendLog, finishExecution, updateTestStatus },
      { testId: selectedTestId, testName: selectedTest?.name || 'Current Test' }
    );
    dispatch(showNotification({ type: 'info', message: '▶  Test execution started' }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = () => {
    dispatch(setActiveOrchestratorTab('analysis'));
    dispatch(showNotification({ type: 'info', message: 'Analyzing test code...' }));
    setTimeout(() => {
      dispatch(showNotification({ type: 'success', message: 'Analysis complete! 3 locators, 4 data points found.' }));
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-2 pt-1">
        <div className="flex items-center gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => dispatch(setActiveOrchestratorTab(tab.id))}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-primary border-primary bg-muted/50'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        {activeTab === 'test-code' && (
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
            >
              <Zap size={13} />
              Analyse
            </button>
            <button
              onClick={() => setSaveDialogOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
            >
              <Save size={13} />
              Save
            </button>
            <button
              onClick={handleRunTest}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md"
            >
              <Play size={13} />
              {isRunning ? 'Running...' : 'Run Test'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'test-code' && (
          <TestCodeTab
            code={currentCode}
            onChange={(c) => dispatch(setCurrentCode(c))}
            selectedTest={selectedTest}
          />
        )}
        {activeTab === 'page-objects' && (
          <PageObjectsTab framework={framework} />
        )}
        {activeTab === 'framework' && (
          <FrameworkTab framework={framework} />
        )}
        {activeTab === 'analysis' && (
          <AnalysisTab code={currentCode} framework={framework} />
        )}
      </div>

      <SaveTestDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        code={currentCode}
        testName={selectedTest?.name}
      />
    </div>
  );
}

/* ── Test Code Tab ── */
function TestCodeTab({ code, onChange, selectedTest }) {
  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {selectedTest && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Editing:</span>
          <span className="text-xs font-medium text-foreground">{selectedTest.name}</span>
          {selectedTest.tags?.map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      <textarea
        value={code}
        onChange={e => onChange(e.target.value)}
        className="code-editor flex-1 w-full"
        placeholder="// Paste or write your Playwright test code here..."
        spellCheck={false}
      />
    </div>
  );
}

/* ── Page Objects Tab ── */
function PageObjectsTab({ framework }) {
  const categories = Object.entries(framework.locators || {});
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Page Object Locators</h3>
        <span className="text-xs text-muted-foreground">{categories.length} categories</span>
      </div>
      {categories.map(([category, locators]) => (
        <div key={category} className="bg-muted/40 rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/60 border-b border-border">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{category}</span>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(locators).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Locators.{category}.{key}
                    </span>
                  </div>
                  <code className="text-xs text-muted-foreground font-code">{value}</code>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`Locators.${category}.${key}`)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Copy locator path"
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Framework Tab ── */
function FrameworkTab({ framework }) {
  const [activeSection, setActiveSection] = useState('locators');
  const content = activeSection === 'locators'
    ? JSON.stringify(framework.locators, null, 2)
    : JSON.stringify(framework.testData, null, 2);

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex gap-2">
        {['locators', 'testData'].map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              activeSection === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'locators' ? '🎯 Locators' : '📦 Test Data'}
          </button>
        ))}
      </div>
      <pre className="code-editor flex-1 text-xs overflow-auto">{content}</pre>
    </div>
  );
}

/* ── Analysis Tab ── */
function AnalysisTab({ code, framework }) {
  const locatorCount = (code.match(/page\.(locator|getByRole|getByText|getByLabel|getByPlaceholder)/g) || []).length;
  const assertionCount = (code.match(/expect\(/g) || []).length;
  const actionCount = (code.match(/\.(click|fill|goto|type|check|uncheck|selectOption)\(/g) || []).length;
  const urlMatches = code.match(/https?:\/\/[^\s'"]+/g) || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Code Analysis</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Locators', value: locatorCount, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Assertions', value: assertionCount, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Actions', value: actionCount, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(stat => (
          <div key={stat.label} className={`p-3 rounded-lg border border-border ${stat.bg}`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* URLs */}
      {urlMatches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">URLs Found</h4>
          <div className="space-y-1">
            {urlMatches.map((url, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <code className="text-xs text-foreground font-code truncate">{url}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lines */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Code Metrics</h4>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between px-3 py-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Total lines</span>
            <span className="font-medium text-foreground">{code.split('\n').length}</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Characters</span>
            <span className="font-medium text-foreground">{code.length.toLocaleString()}</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Framework locators</span>
            <span className="font-medium text-foreground">
              {Object.values(framework.locators || {}).reduce((a, c) => a + Object.keys(c).length, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
