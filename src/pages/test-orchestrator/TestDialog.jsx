import { useState, useEffect } from 'react';
import { X, Tag, Code, Check } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function TestDialog({ open, onClose, mode, type, initial, context, onSubmit }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setTags(initial?.tags?.join(', ') || '');
      setCode(initial?.code || getDefaultCode(type));
    }
  }, [open, initial, type]);

  if (!open) return null;

  const titles = {
    add: {
      module: 'Add Module',
      suite: 'Add Test Suite',
      test: 'Add Test Case',
    },
    edit: {
      module: 'Edit Module',
      suite: 'Edit Test Suite',
      test: 'Edit Test Case',
    },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit({ name: name.trim(), tags: parsedTags, code });
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card rounded-xl shadow-elevation-xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground text-lg">{titles[mode]?.[type] || 'Dialog'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {type === 'module' ? 'Module Name' : type === 'suite' ? 'Suite Name' : 'Test Name'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={
                type === 'module' ? 'e.g., Authentication' :
                type === 'suite' ? 'e.g., Login Tests' : 'e.g., Valid Login Flow'
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              autoFocus
            />
          </div>

          {/* Tags (for suite and test) */}
          {(type === 'suite' || type === 'test') && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Tag size={13} className="inline mr-1" />
                Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g., smoke, regression, auth"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          )}

          {/* Code (for test) */}
          {type === 'test' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Code size={13} className="inline mr-1" />
                Test Code
              </label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="code-editor w-full h-64 resize-y"
                placeholder="Paste your Playwright test code here..."
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Standard Playwright test format. Uses Chromium by default.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-5 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Check size={15} />
            {mode === 'edit' ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getDefaultCode(type) {
  if (type !== 'test') return '';
  return `import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});`;
}
