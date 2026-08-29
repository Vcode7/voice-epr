'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Edit2, Trash2, Copy, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { DataTemplate } from '@/types';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE } from '@/lib/constants';
import { TemplateEditModal } from '@/components/modals/TemplateEditModal';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DataTemplate[]>([DEFAULT_MONITORING_DETAILS_TEMPLATE]);
  const [editingTemplate, setEditingTemplate] = useState<DataTemplate | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates([DEFAULT_MONITORING_DETAILS_TEMPLATE]);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
      setTemplates([DEFAULT_MONITORING_DETAILS_TEMPLATE]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Template Manager & Schema Studio
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Configure extraction schemas, tables, and auto-fill lookup mappings for voice logging.
          </p>
        </div>

        <button
          onClick={() => setEditingTemplate(null)}
          className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-primary/25 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
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
            className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder hover:border-primary/40 transition space-y-3 sm:space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-cardBorder/60">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-text flex items-center gap-1.5 flex-wrap">
                  {tmpl.name}
                  {tmpl.isDefault && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface text-textMuted border border-cardBorder">
                      Default
                    </span>
                  )}
                  {tmpl.autoFill?.enabled && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Auto-Fill Enabled
                    </span>
                  )}
                </h3>
                {tmpl.description && <p className="text-xs text-textSubtle mt-0.5">{tmpl.description}</p>}
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleDuplicate(tmpl)}
                  title="Duplicate"
                  className="p-1.5 rounded-lg bg-surface hover:bg-primary/20 hover:text-primary text-textSubtle transition cursor-pointer border border-cardBorder"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingTemplate(tmpl)}
                  className="p-1.5 rounded-lg bg-surface hover:bg-primary/20 hover:text-primary text-textSubtle transition cursor-pointer border border-cardBorder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {!tmpl.isDefault && (
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger text-textSubtle transition cursor-pointer border border-cardBorder"
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
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-surface border border-cardBorder text-text font-medium"
                  >
                    {f.name} <span className="text-[9px] text-textSubtle">({f.type})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Auto-fill breakdown if active */}
            {tmpl.autoFill?.enabled && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto-Fill Mapping:
                </div>
                <div className="text-[11px] text-text">
                  Base Field: <strong className="font-bold text-primary">{tmpl.autoFill.baseFieldKey}</strong>
                  <span className="mx-1 text-textSubtle">➔</span>
                  Populates: <span className="text-text font-medium">{tmpl.autoFill.targetFieldKeys.join(', ')}</span>
                  <span className="text-textSubtle ml-2">({Object.keys(tmpl.autoFill.mappings || {}).length} rows)</span>
                </div>
              </div>
            )}

            {tmpl.hasTable && (
              <div className="space-y-1.5 pt-2 border-t border-cardBorder/60">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase text-dataColor">
                  {tmpl.tableTitle || 'Table'} Columns ({tmpl.tableFields?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {(tmpl.tableFields || []).map((col) => (
                    <span
                      key={col.id}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-surface border border-dataColor/30 text-dataColor font-medium"
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
          onSaved={fetchTemplates}
        />
      )}
    </div>
  );
}
