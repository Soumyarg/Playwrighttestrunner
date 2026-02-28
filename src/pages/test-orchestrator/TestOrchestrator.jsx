import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addModule, addSuite, addTest, deleteModule, deleteSuite, deleteTest } from '../../store/testsSlice';
import { showNotification } from '../../store/uiSlice';
import SuiteExplorer from './SuiteExplorer';
import OrchestratorTabs from './OrchestratorTabs';
import TestDialog from './TestDialog';

export default function TestOrchestrator() {
  const dispatch = useDispatch();
  const [dialog, setDialog] = useState({ open: false, mode: 'add', type: 'module', context: {}, initial: null });

  const openAdd = (type, context = {}) => setDialog({ open: true, mode: 'add', type, context, initial: null });
  const openEdit = ({ type, item, ...ctx }) => setDialog({ open: true, mode: 'edit', type, context: ctx, initial: item });
  const closeDialog = () => setDialog(d => ({ ...d, open: false }));

  const handleDialogSubmit = (data) => {
    const { type, mode, context } = dialog;
    if (mode === 'add') {
      if (type === 'module') {
        dispatch(addModule({ name: data.name }));
        dispatch(showNotification({ type: 'success', message: `Module "${data.name}" created` }));
      } else if (type === 'suite') {
        dispatch(addSuite({ moduleId: context.moduleId, name: data.name, tags: data.tags }));
        dispatch(showNotification({ type: 'success', message: `Suite "${data.name}" created` }));
      } else if (type === 'test') {
        dispatch(addTest({ suiteId: context.suiteId, name: data.name, tags: data.tags, code: data.code }));
        dispatch(showNotification({ type: 'success', message: `Test "${data.name}" created` }));
      }
    }
    closeDialog();
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-bold text-foreground font-heading">Test Orchestrator</h1>
          <p className="text-xs text-muted-foreground">Manage and organize your Playwright test suites</p>
        </div>
      </div>

      {/* Main Layout: Explorer | Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Suite Explorer */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-card overflow-hidden flex flex-col">
          <SuiteExplorer
            onAddModule={() => openAdd('module')}
            onAddSuite={(moduleId) => openAdd('suite', { moduleId })}
            onAddTest={(suiteId) => openAdd('test', { suiteId })}
            onEdit={openEdit}
          />
        </div>

        {/* Right: Editor Tabs */}
        <div className="flex-1 overflow-hidden bg-background">
          <OrchestratorTabs />
        </div>
      </div>

      {/* Dialog */}
      <TestDialog
        open={dialog.open}
        onClose={closeDialog}
        mode={dialog.mode}
        type={dialog.type}
        initial={dialog.initial}
        context={dialog.context}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}
