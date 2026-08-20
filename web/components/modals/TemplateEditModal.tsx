'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Layers, Table } from 'lucide-react';
import { DataTemplate, TemplateField, FieldType } from '@/types';

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
];

interface TemplateEditModalProps {
  template?: DataTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TemplateEditModal({ template, onClose, onSaved }: TemplateEditModalProps) {
  const isEditing = !!template;
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [fields, setFields] = useState<TemplateField[]>(
    template?.fields || [
      { id: 'f1', name: 'Item Name', extractionKey: 'item_name', type: 'text', placeholder: 'e.g. Product A' },
      { id: 'f2', name: 'Batch No', extractionKey: 'batch_no', type: 'text', placeholder: 'e.g. B-101' },
      { id: 'f3', name: 'Quantity', extractionKey: 'quantity', type: 'number', placeholder: 'e.g. 50' },
    ]
  );
  const [hasTable, setHasTable] = useState(template?.hasTable ?? true);
  const [tableTitle, setTableTitle] = useState(template?.tableTitle || 'Repeated Logs Table');
  const [tableFields, setTableFields] = useState<TemplateField[]>(
    template?.tableFields || [
      { id: 'tf1', name: 'Start Time', extractionKey: 'start_time', type: 'time', placeholder: '09:00 AM' },
      { id: 'tf2', name: 'End Time', extractionKey: 'end_time', type: 'time', placeholder: '10:00 AM' },
      { id: 'tf3', name: 'Produced Qty', extractionKey: 'produced_qty', type: 'number', placeholder: '100' },
    ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const addField = () => {
    const id = `f_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      { id, name: `Custom Field ${prev.length + 1}`, extractionKey: `field_${prev.length + 1}`, type: 'text' },
    ]);
  };

  const updateField = (idx: number, key: keyof TemplateField, val: any) => {
    setFields((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [key]: val };
      if (key === 'name' && (!copy[idx].extractionKey || copy[idx].extractionKey === toSlug(copy[idx].name))) {
        item.extractionKey = toSlug(val);
      }
      copy[idx] = item;
      return copy;
    });
  };

  const deleteField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTableField = () => {
    const id = `tf_${Date.now()}`;
    setTableFields((prev) => [
      ...prev,
      { id, name: `Column ${prev.length + 1}`, extractionKey: `col_${prev.length + 1}`, type: 'text' },
    ]);
  };

  const updateTableField = (idx: number, key: keyof TemplateField, val: any) => {
    setTableFields((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [key]: val };
      if (key === 'name' && (!copy[idx].extractionKey || copy[idx].extractionKey === toSlug(copy[idx].name))) {
        item.extractionKey = toSlug(val);
      }
      copy[idx] = item;
      return copy;
    });
  };

  const deleteTableField = (idx: number) => {
    setTableFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload: DataTemplate = {
        id: template?.id || `template_custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault: template?.isDefault || false,
        fields,
        hasTable,
        tableTitle: hasTable ? tableTitle.trim() : undefined,
        tableFields: hasTable ? tableFields : [],
        createdAt: template?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const url = isEditing ? `/api/templates/${template.id}` : '/api/templates';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save template.');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-cardBorder rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-cardBorder flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              {isEditing ? `Edit: ${template.name}` : 'Create Template'}
            </h2>
            <p className="text-[11px] sm:text-xs text-textMuted mt-0.5">
              Define fields and table schema for structured voice extraction.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl text-textMuted hover:text-text hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          {/* Template Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-cardBorder">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shift Quality Log"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs sm:text-sm text-text font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs sm:text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Direct Fields List */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Top-Level Fields ({fields.length})
              </h3>
              <button
                onClick={addField}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id || idx} className="p-3 rounded-xl bg-slate-900/50 border border-cardBorder grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">Field Label</label>
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => updateField(idx, 'name', e.target.value)}
                      placeholder="Field Label"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">AI Key</label>
                    <input
                      type="text"
                      value={f.extractionKey}
                      onChange={(e) => updateField(idx, 'extractionKey', e.target.value)}
                      placeholder="AI Key"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-textSubtle focus:outline-none focus:border-primary font-mono text-[11px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">Type</label>
                    <select
                      value={f.type}
                      onChange={(e) => updateField(idx, 'type', e.target.value as FieldType)}
                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button onClick={() => deleteField(idx)} className="text-textSubtle hover:text-danger p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repeated Table Toggle & Schema */}
          <div className="space-y-3 pt-3 border-t border-cardBorder">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table className="w-4 h-4 text-dataColor" />
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">Include Table</h3>
                  <p className="text-[10px] sm:text-[11px] text-textMuted">Enable for hourly logs or interval rows.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasTable}
                onChange={(e) => setHasTable(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-cardBorder"
              />
            </div>

            {hasTable && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-cardBorder space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                    Table Header Title
                  </label>
                  <input
                    type="text"
                    value={tableTitle}
                    onChange={(e) => setTableTitle(e.target.value)}
                    placeholder="e.g. Hourly Production Logs"
                    className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle">Table Columns</label>
                    <button
                      onClick={addTableField}
                      className="text-xs text-dataColor hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Column
                    </button>
                  </div>

                  {tableFields.map((col, idx) => (
                    <div key={col.id || idx} className="p-2.5 rounded-xl bg-slate-900/50 border border-cardBorder grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateTableField(idx, 'name', e.target.value)}
                          placeholder="Column Name"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={col.extractionKey}
                          onChange={(e) => updateTableField(idx, 'extractionKey', e.target.value)}
                          placeholder="AI Key"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-textSubtle focus:outline-none focus:border-primary font-mono text-[11px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <select
                          value={col.type}
                          onChange={(e) => updateTableField(idx, 'type', e.target.value as FieldType)}
                          className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button onClick={() => deleteTableField(idx)} className="text-textSubtle hover:text-danger p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-cardBorder bg-slate-900/50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-cardBorder text-textMuted hover:text-text hover:bg-slate-800 text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-primary/25 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
