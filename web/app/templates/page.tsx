'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Copy, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { DataTemplate } from '@/types';
import { TemplateEditModal } from '@/components/modals/TemplateEditModal';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DataTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<DataTemplate | null | undefined>(undefined);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
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
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            EPR Data Templates
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Build custom voice data schemas with attributes and repeated tables.
          </p>
        </div>

        <button
          onClick={() => setEditingTemplate(null)}
          className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder hover:border-slate-600 transition space-y-3 sm:space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-cardBorder/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-text flex items-center gap-1.5 flex-wrap">
                  {tmpl.name}
                  {tmpl.isDefault && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-textMuted border border-cardBorder">
                      Default
                    </span>
                  )}
                </h3>
                {tmpl.description && <p className="text-xs text-textSubtle mt-0.5">{tmpl.description}</p>}
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleDuplicate(tmpl)}
                  title="Duplicate"
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-textSubtle hover:text-text transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingTemplate(tmpl)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-textSubtle hover:text-text transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {!tmpl.isDefault && (
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-danger/20 hover:text-danger text-textSubtle transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Field breakdown */}
            <div className="space-y-1.5">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle">
                Top Fields ({tmpl.fields.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {tmpl.fields.map((f) => (
                  <span
                    key={f.id}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-cardBorder text-textMuted font-medium"
                  >
                    {f.name} <span className="text-[9px] text-textSubtle">({f.type})</span>
                  </span>
                ))}
              </div>
            </div>

            {tmpl.hasTable && (
              <div className="space-y-1.5 pt-2 border-t border-cardBorder/60">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase text-dataColor">
                  {tmpl.tableTitle || 'Table'} Columns ({tmpl.tableFields?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {(tmpl.tableFields || []).map((col) => (
                    <span
                      key={col.id}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-400 font-medium"
                    >
                      {col.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Reset */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-cardBorder flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs text-textMuted">
          Restore default Monitoring Details template?
        </span>
        <button
          onClick={handleResetDefaults}
          className="text-xs text-textSubtle hover:text-text font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
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
    </div>
  );
}
