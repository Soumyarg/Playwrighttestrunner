import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Save, Tag } from 'lucide-react';
import { saveSavedTest } from '../../store/testsSlice';
import { showNotification } from '../../store/uiSlice';

export default function SaveTestDialog({ open, onClose, code, testName }) {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch(saveSavedTest({
      name: name.trim(),
      description: description.trim(),
      code,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    }));
    dispatch(showNotification({ type: 'success', message: `Test "${name}" saved successfully!` }));
    setName('');
    setDescription('');
    setTags('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-card rounded-xl shadow-elevation-xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Save size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Save Test</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Test Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              defaultValue={testName}
              placeholder="e.g., Login Smoke Test"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description of what this test does..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

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

          {/* Code preview */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Code Preview</label>
            <pre className="bg-muted/60 border border-border rounded-lg p-3 text-xs font-code text-muted-foreground overflow-hidden h-16 truncate whitespace-pre-wrap">
              {code?.slice(0, 200)}...
            </pre>
            <p className="text-xs text-muted-foreground mt-1">{code?.length || 0} characters</p>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-foreground bg-muted hover:bg-border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 disabled:opacity-50 rounded-lg">
              <Save size={14} />
              Save Test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
