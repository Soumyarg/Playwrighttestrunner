import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search, Plus, Trash2, Play, Upload, Download, Tag, X,
  BookMarked, Calendar, Code2, CheckSquare, Square, Filter,
  MoreHorizontal, FileText, RefreshCw
} from 'lucide-react';
import {
  deleteSavedTest, deleteSavedTests, saveSavedTest, setCurrentCode
} from '../../store/testsSlice';
import { setActiveOrchestratorTab, showNotification } from '../../store/uiSlice';
import { startExecution, appendLog, finishExecution } from '../../store/executionSlice';
import { formatRelativeTime, getStatusBg } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import SaveTestDialog from '../test-orchestrator/SaveTestDialog';
import { motion, AnimatePresence } from 'framer-motion';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
];

const getTagColor = (tag) => {
  const idx = tag.charCodeAt(0) % TAG_COLORS.length;
  return TAG_COLORS[idx];
};

export default function SavedTests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const savedTests = useSelector(state => state.tests.savedTests);
  const isRunning = useSelector(state => state.execution.isRunning);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewCode, setViewCode] = useState(null); // test id whose code to view
  const [sortBy, setSortBy] = useState('updatedAt');

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set();
    savedTests.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return [...tagSet];
  }, [savedTests]);

  // Filtered tests
  const filteredTests = useMemo(() => {
    let tests = [...savedTests];
    if (search) {
      const q = search.toLowerCase();
      tests = tests.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (selectedTags.length > 0) {
      tests = tests.filter(t => selectedTags.every(tag => t.tags?.includes(tag)));
    }
    tests.sort((a, b) => new Date(b[sortBy]) - new Date(a[sortBy]));
    return tests;
  }, [savedTests, search, selectedTags, sortBy]);

  const isAllSelected = filteredTests.length > 0 && filteredTests.every(t => selectedIds.has(t.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTests.map(t => t.id)));
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleLoad = (test) => {
    dispatch(setCurrentCode(test.code));
    dispatch(setActiveOrchestratorTab('test-code'));
    dispatch(showNotification({ type: 'success', message: `Loaded: ${test.name}` }));
    navigate('/test-orchestrator');
  };

  const handleRunTest = (test) => {
    if (isRunning) return;
    dispatch(startExecution({ testName: test.name }));
    const logs = [
      { type: 'info', msg: `▶  Running: ${test.name}` },
      { type: 'dim', msg: '  →  Launching Chromium...' },
      { type: 'dim', msg: '  ✓  Page loaded' },
      { type: 'dim', msg: '  →  Executing test steps...' },
    ];
    const start = Date.now();
    logs.forEach(({ type, msg }, i) => {
      setTimeout(() => dispatch(appendLog({ type, message: msg })), i * 400);
    });
    const passed = Math.random() > 0.2;
    setTimeout(() => {
      const duration = Date.now() - start;
      dispatch(appendLog({
        type: passed ? 'success' : 'error',
        message: passed ? `  ✓  ${test.name} — PASSED` : `  ✗  ${test.name} — FAILED`,
      }));
      dispatch(finishExecution({
        testName: test.name,
        stats: { total: 1, passed: passed ? 1 : 0, failed: passed ? 0 : 1, skipped: 0, duration },
      }));
      dispatch(showNotification({ type: passed ? 'success' : 'error', message: passed ? 'Test passed!' : 'Test failed!' }));
      navigate('/test-execution');
    }, 2000);
  };

  const handleRunSelected = () => {
    if (selectedIds.size === 0) return;
    const tests = savedTests.filter(t => selectedIds.has(t.id));
    const name = `Batch Run (${tests.length} tests)`;
    dispatch(startExecution({ testName: name }));
    dispatch(appendLog({ type: 'info', message: `▶  Running ${tests.length} saved tests...` }));
    let passed = 0;
    const start = Date.now();
    tests.forEach((test, i) => {
      setTimeout(() => {
        const isPass = Math.random() > 0.2;
        if (isPass) passed++;
        dispatch(appendLog({
          type: isPass ? 'success' : 'error',
          message: `  ${isPass ? '✓' : '✗'}  ${test.name}`,
        }));
        if (i === tests.length - 1) {
          dispatch(finishExecution({
            testName: name,
            stats: { total: tests.length, passed, failed: tests.length - passed, skipped: 0, duration: Date.now() - start },
          }));
          dispatch(showNotification({ type: 'info', message: `Batch complete: ${passed}/${tests.length} passed` }));
          navigate('/test-execution');
        }
      }, i * 500 + 300);
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected test(s)?`)) return;
    dispatch(deleteSavedTests([...selectedIds]));
    setSelectedIds(new Set());
    dispatch(showNotification({ type: 'success', message: `${selectedIds.size} test(s) deleted` }));
  };

  const handleDelete = (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    dispatch(deleteSavedTest(id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    dispatch(showNotification({ type: 'success', message: `"${name}" deleted` }));
  };

  const viewingTest = viewCode ? savedTests.find(t => t.id === viewCode) : null;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground font-heading">Saved Tests</h1>
          <p className="text-xs text-muted-foreground">{savedTests.length} tests saved</p>
        </div>
        <button
          onClick={() => setSaveDialogOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg"
        >
          <Plus size={16} />
          New Test
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 bg-card border-b border-border flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Tags filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none"
        >
          <option value="updatedAt">Last updated</option>
          <option value="createdAt">Date created</option>
          <option value="name">Name</option>
        </select>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <button
              onClick={handleRunSelected}
              disabled={isRunning}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              <Play size={12} />
              Run Selected
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
            >
              <Trash2 size={12} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Select all row */}
        {filteredTests.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              {isAllSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
              {isAllSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-muted-foreground">
              {filteredTests.length} of {savedTests.length} tests
            </span>
          </div>
        )}

        {/* Test Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredTests.map(test => (
              <motion.div
                key={test.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`bg-card rounded-xl border transition-all shadow-elevation-sm hover:shadow-elevation-md ${
                  selectedIds.has(test.id) ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-2.5 p-4 pb-2">
                  <button onClick={() => toggleSelect(test.id)} className="mt-0.5 flex-shrink-0">
                    {selectedIds.has(test.id)
                      ? <CheckSquare size={16} className="text-primary" />
                      : <Square size={16} className="text-muted-foreground hover:text-foreground" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">{test.name}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <BookMarked size={13} className="text-muted-foreground" />
                      </div>
                    </div>
                    {test.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{test.description}</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {test.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-4 pb-2">
                    {test.tags.map(tag => (
                      <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Code Preview */}
                <div
                  className="mx-4 mb-3 bg-muted/40 rounded-md p-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => setViewCode(test.id === viewCode ? null : test.id)}
                >
                  <pre className="text-xs font-code text-muted-foreground overflow-hidden" style={{ maxHeight: viewCode === test.id ? '200px' : '52px' }}>
                    {test.code}
                  </pre>
                  {viewCode !== test.id && (
                    <p className="text-xs text-muted-foreground mt-1 text-right">{test.code?.length} chars · click to expand</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 px-4 pb-3 text-xs text-muted-foreground">
                  <Calendar size={11} />
                  <span>Updated {formatRelativeTime(test.updatedAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border">
                  <button
                    onClick={() => handleLoad(test)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md flex-1 justify-center border border-blue-200 dark:border-blue-800"
                  >
                    <Code2 size={12} />
                    Load
                  </button>
                  <button
                    onClick={() => handleRunTest(test)}
                    disabled={isRunning}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md flex-1 justify-center"
                  >
                    <Play size={12} />
                    Run
                  </button>
                  <button
                    onClick={() => handleDelete(test.id, test.name)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredTests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookMarked size={40} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {search || selectedTags.length > 0 ? 'No tests match your filters' : 'No saved tests yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Save tests from the Orchestrator to manage them here'
              }
            </p>
            {!search && selectedTags.length === 0 && (
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg"
              >
                <Plus size={14} />
                Create New Test
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save Test Dialog - for creating new */}
      <SaveTestDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        code={`import { test, expect } from '@playwright/test';\n\ntest('my test', async ({ page }) => {\n  await page.goto('https://example.com');\n  await expect(page).toHaveTitle(/Example/);\n});`}
      />
    </div>
  );
}
