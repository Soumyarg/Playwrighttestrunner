import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Edit2, Play,
  FolderOpen, Folder, FileText, Tag, Check
} from 'lucide-react';
import {
  toggleModule, toggleSuite, setSelectedTest, deleteModule,
  deleteSuite, deleteTest, updateTestStatus
} from '../../store/testsSlice';
import { showNotification } from '../../store/uiSlice';
import { getStatusBg, formatRelativeTime } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function SuiteExplorer({ onAddModule, onAddSuite, onAddTest, onEdit }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const modules = useSelector(state => state.tests.modules);
  const selectedTestId = useSelector(state => state.tests.selectedTestId);

  const handleRunTest = (test) => {
    // Select the test code and navigate to the Execution page
    dispatch(setSelectedTest(test));
    dispatch(showNotification({ type: 'info', message: `Loaded "${test.name}" — Connect & run on Execution page` }));
    navigate('/test-execution');
  };

  const handleDeleteModule = (modId, modName) => {
    if (confirm(`Delete module "${modName}" and all its contents?`)) {
      dispatch(deleteModule(modId));
      dispatch(showNotification({ type: 'success', message: 'Module deleted' }));
    }
  };

  const handleDeleteSuite = (suiteId, suiteName) => {
    if (confirm(`Delete suite "${suiteName}" and all its tests?`)) {
      dispatch(deleteSuite(suiteId));
      dispatch(showNotification({ type: 'success', message: 'Suite deleted' }));
    }
  };

  const handleDeleteTest = (testId, testName) => {
    if (confirm(`Delete test "${testName}"?`)) {
      dispatch(deleteTest(testId));
      dispatch(showNotification({ type: 'success', message: 'Test deleted' }));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Test Suite Explorer</h2>
        <button
          onClick={onAddModule}
          className="flex items-center gap-1 text-xs text-primary hover:text-blue-700 font-medium"
        >
          <Plus size={14} />
          Add Module
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />
            <p>No modules yet</p>
            <button onClick={onAddModule} className="mt-2 text-primary text-xs hover:underline">
              Create your first module
            </button>
          </div>
        ) : (
          modules.map(mod => (
            <ModuleItem
              key={mod.id}
              module={mod}
              selectedTestId={selectedTestId}
              onToggle={() => dispatch(toggleModule(mod.id))}
              onAddSuite={() => onAddSuite(mod.id)}
              onEdit={() => onEdit({ type: 'module', item: mod })}
              onDelete={() => handleDeleteModule(mod.id, mod.name)}
              onToggleSuite={(id) => dispatch(toggleSuite(id))}
              onSelectTest={(test) => dispatch(setSelectedTest(test))}
              onAddTest={onAddTest}
              onEditSuite={(suite) => onEdit({ type: 'suite', item: suite, moduleId: mod.id })}
              onDeleteSuite={handleDeleteSuite}
              onEditTest={(test, suite) => onEdit({ type: 'test', item: test, suiteId: suite.id })}
              onDeleteTest={handleDeleteTest}
              onRunTest={handleRunTest}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ModuleItem({
  module, selectedTestId, onToggle, onAddSuite, onEdit, onDelete,
  onToggleSuite, onSelectTest, onAddTest, onEditSuite, onDeleteSuite,
  onEditTest, onDeleteTest, onRunTest
}) {
  const totalTests = module.suites.reduce((a, s) => a + s.tests.length, 0);

  return (
    <div className="mb-1">
      <div className="tree-item flex items-center gap-1 px-2 py-1.5 hover:bg-muted/60 rounded-md mx-1 group cursor-pointer" onClick={onToggle}>
        <span className="text-muted-foreground w-4 flex-shrink-0">
          {module.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {module.expanded ? (
          <FolderOpen size={15} className="text-amber-500 flex-shrink-0" />
        ) : (
          <Folder size={15} className="text-amber-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground flex-1 truncate">{module.name}</span>
        <span className="text-xs text-muted-foreground mr-1">{totalTests}</span>

        {/* Actions */}
        <div className="tree-actions flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onAddSuite(); }}
            className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground" title="Add suite">
            <Plus size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 text-muted-foreground" title="Edit">
            <Edit2 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 text-muted-foreground" title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {module.expanded && (
        <div className="ml-5">
          {module.suites.map(suite => (
            <SuiteItem
              key={suite.id}
              suite={suite}
              selectedTestId={selectedTestId}
              onToggle={() => onToggleSuite(suite.id)}
              onAddTest={() => onAddTest(suite.id)}
              onEdit={() => onEditSuite(suite)}
              onDelete={() => onDeleteSuite(suite.id, suite.name)}
              onSelectTest={onSelectTest}
              onEditTest={onEditTest}
              onDeleteTest={onDeleteTest}
              onRunTest={onRunTest}
            />
          ))}
          {module.suites.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No suites.{' '}
              <button onClick={onAddSuite} className="text-primary hover:underline">Add one</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuiteItem({ suite, selectedTestId, onToggle, onAddTest, onEdit, onDelete, onSelectTest, onEditTest, onDeleteTest, onRunTest }) {
  return (
    <div className="mb-0.5">
      <div className="tree-item flex items-center gap-1 px-2 py-1.5 hover:bg-muted/60 rounded-md cursor-pointer group" onClick={onToggle}>
        <span className="text-muted-foreground w-4 flex-shrink-0">
          {suite.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <FileText size={14} className="text-blue-400 flex-shrink-0" />
        <span className="text-sm text-foreground flex-1 truncate">{suite.name}</span>
        <span className="text-xs text-muted-foreground">{suite.tests.length}</span>
        <div className="tree-actions flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onAddTest(); }}
            className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground" title="Add test">
            <Plus size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded hover:text-blue-600 text-muted-foreground">
            <Edit2 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:text-red-600 text-muted-foreground">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {suite.expanded && (
        <div className="ml-5">
          {suite.tests.map(test => (
            <TestItem
              key={test.id}
              test={test}
              isSelected={selectedTestId === test.id}
              onSelect={() => onSelectTest(test)}
              onEdit={() => onEditTest(test, suite)}
              onDelete={() => onDeleteTest(test.id, test.name)}
              onRun={() => onRunTest(test)}
            />
          ))}
          {suite.tests.length === 0 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground">
              No tests.{' '}
              <button onClick={onAddTest} className="text-primary hover:underline">Add one</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TestItem({ test, isSelected, onSelect, onEdit, onDelete, onRun }) {
  const statusDot = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    running: 'bg-blue-500',
    skipped: 'bg-gray-400',
    pending: 'bg-yellow-400',
  };

  return (
    <div
      className={`tree-item flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group ${
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
      }`}
      onClick={onSelect}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[test.status] || 'bg-gray-400'}`} />
      <span className={`text-xs flex-1 truncate ${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>
        {test.name}
      </span>
      <div className="tree-actions flex items-center gap-0.5">
        <button onClick={(e) => { e.stopPropagation(); onRun(); }}
          className="p-1 rounded hover:text-green-600 text-muted-foreground" title="Run test">
          <Play size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 rounded hover:text-blue-600 text-muted-foreground">
          <Edit2 size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:text-red-600 text-muted-foreground">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
