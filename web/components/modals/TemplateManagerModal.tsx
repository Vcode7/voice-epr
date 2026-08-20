'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, Copy, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { DataTemplate } from '@/types';
import { TemplateEditModal } from './TemplateEditModal';

interface TemplateManagerModalProps {
  activeTemplateId: string;
  onSelectActive: (template: DataTemplate) => void;
  onClose: () => void;
}

export function TemplateManagerModal({
  activeTemplateId,
  onSelectActive,
  onClose,
}: TemplateManagerModalProps) {
  const [templates, setTemplates] = useState<DataTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<DataTemplate | null | undefined>(undefined);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDuplicate = async (tmpl: DataTemplate) => {
    const clone: DataTemplate = {
      ...tmpl,
      id: `template_custom_${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clone),
    });

    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset templates back to system default Monitoring Details template?')) return;
    await fetch('/api/templates/reset', { method: 'POST' });
    fetchTemplates();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-cardBorder flex items-center justify-between bg-slate-900/50">
            <div>
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Data Templates Manager
              </h2>
              <p className="text-xs text-textMuted mt-0.5">
                Select active template for voice EPR dictation, or build new custom schemas.
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-textMuted hover:text-text hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text uppercase tracking-wider">
                Available Templates ({templates.length})
              </span>
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-textMuted">Loading templates...</div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {templates.map((tmpl) => {
                  const isActive = tmpl.id === activeTemplateId;

                  return (
                    <div
                      key={tmpl.id}
                      className={`p-4 rounded-xl border transition flex items-center justify-between ${
                        isActive
                          ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/10'
                          : 'bg-slate-900/60 border-cardBorder hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text">{tmpl.name}</h4>
                          {tmpl.isDefault && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-textMuted border border-cardBorder">
                              Built-in Default
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active on Studio
                            </span>
                          )}
                        </div>
                        {tmpl.description && <p className="text-xs text-textSubtle">{tmpl.description}</p>}
                        <div className="flex items-center gap-3 text-[11px] text-textMuted pt-1">
                          <span>{tmpl.fields.length} top fields</span>
                          <span>•</span>
                          <span>{tmpl.hasTable ? `${tmpl.tableFields?.length || 0} table cols` : 'No table'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!isActive && (
                          <button
                            onClick={() => onSelectActive(tmpl)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-primary text-xs font-semibold text-text transition cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(tmpl)}
                          title="Duplicate template"
                          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-textSubtle hover:text-text transition cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingTemplate(tmpl)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-text transition cursor-pointer"
                        >
                          Edit
                        </button>
                        {!tmpl.isDefault && (
                          <button
                            onClick={() => handleDelete(tmpl.id)}
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-danger/20 hover:text-danger text-textSubtle transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-cardBorder bg-slate-900/50 flex items-center justify-between">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-textSubtle hover:text-text flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset System Defaults
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-text transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {editingTemplate !== undefined && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(undefined)}
          onSaved={() => {
            setEditingTemplate(undefined);
            fetchTemplates();
          }}
        />
      )}
    </>
  );
}
