'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Layers,
  Table,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { DataTemplate, TemplateField, FieldType, AutoFillMappingEntry, TemplateAutoFillConfig } from '@/types';
import {
  parseAutoFillCsv,
  buildMappingsFromManualEntries,
  validateAutoFillConfig,
  generateSampleCsv,
  findAutoFillMatch,
} from '@/lib/utils/autoFillHelper';

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'select', label: 'Fixed Options / Dropdown' },
  { type: 'boolean', label: 'Boolean (Yes/No)' },
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
      { id: 'f1', name: 'Part No', extractionKey: 'part_no', type: 'text', placeholder: 'e.g. 2345' },
      { id: 'f2', name: 'Description', extractionKey: 'description', type: 'text', placeholder: 'e.g. Brake Pad' },
      { id: 'f3', name: 'Category', extractionKey: 'category', type: 'text', placeholder: 'e.g. Automotive' },
      { id: 'f4', name: 'Price', extractionKey: 'price', type: 'number', placeholder: 'e.g. 450' },
    ]
  );
  const [hasTable, setHasTable] = useState(template?.hasTable ?? false);
  const [tableTitle, setTableTitle] = useState(template?.tableTitle || 'Repeated Logs Table');
  const [tableFields, setTableFields] = useState<TemplateField[]>(
    template?.tableFields || [
      { id: 'tf1', name: 'Start Time', extractionKey: 'start_time', type: 'time', placeholder: '09:00 AM' },
      { id: 'tf2', name: 'End Time', extractionKey: 'end_time', type: 'time', placeholder: '10:00 AM' },
      { id: 'tf3', name: 'Produced Qty', extractionKey: 'produced_qty', type: 'number', placeholder: '100' },
    ]
  );

  // Auto-Fill State
  const [autoFillEnabled, setAutoFillEnabled] = useState(template?.autoFill?.enabled ?? false);
  const [baseFieldKey, setBaseFieldKey] = useState(
    template?.autoFill?.baseFieldKey || template?.fields?.[0]?.extractionKey || ''
  );
  const [targetFieldKeys, setTargetFieldKeys] = useState<string[]>(
    template?.autoFill?.targetFieldKeys ||
      (template?.fields && template.fields.length > 1
        ? template.fields.slice(1).map((f) => f.extractionKey)
        : [])
  );
  const [sourceType, setSourceType] = useState<'csv' | 'manual'>(template?.autoFill?.sourceType || 'csv');
  const [rawCsvText, setRawCsvText] = useState(template?.autoFill?.rawCsvText || '');
  const [manualEntries, setManualEntries] = useState<AutoFillMappingEntry[]>(
    template?.autoFill?.manualEntries || [
      { baseValue: '2345', values: { description: 'Brake Pad', category: 'Automotive', price: '450' } },
      { baseValue: '2346', values: { description: 'Oil Filter', category: 'Automotive', price: '250' } },
    ]
  );
  const [testBaseInput, setTestBaseInput] = useState('2345');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  // Derived / memoized Auto-Fill mappings and errors without triggering recursive re-renders
  const { mappings, autoFillErrors, autoFillWarnings } = useMemo(() => {
    if (!autoFillEnabled) {
      return { mappings: {}, autoFillErrors: [], autoFillWarnings: [] };
    }

    if (!baseFieldKey) {
      return {
        mappings: {},
        autoFillErrors: ['Please select a Base Field for lookup.'],
        autoFillWarnings: [],
      };
    }

    if (!targetFieldKeys || targetFieldKeys.length === 0) {
      return {
        mappings: {},
        autoFillErrors: ['Please select at least one Auto-Fill Field.'],
        autoFillWarnings: [],
      };
    }

    if (sourceType === 'csv') {
      if (!rawCsvText.trim()) {
        return {
          mappings: {},
          autoFillErrors: ['CSV data is empty. Upload a CSV file or switch to manual entry.'],
          autoFillWarnings: [],
        };
      }
      const res = parseAutoFillCsv(rawCsvText, baseFieldKey, targetFieldKeys, fields);
      return {
        mappings: res.mappings,
        autoFillErrors: res.errors,
        autoFillWarnings: res.warnings,
      };
    } else {
      const res = buildMappingsFromManualEntries(manualEntries, baseFieldKey, targetFieldKeys);
      return {
        mappings: res.mappings,
        autoFillErrors: res.errors,
        autoFillWarnings: res.warnings,
      };
    }
  }, [autoFillEnabled, baseFieldKey, targetFieldKeys, sourceType, rawCsvText, manualEntries, fields]);

  const addField = () => {
    const id = `f_${Date.now()}`;
    const newField: TemplateField = {
      id,
      name: `Custom Field ${fields.length + 1}`,
      extractionKey: `field_${fields.length + 1}`,
      type: 'text',
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (idx: number, key: keyof TemplateField, val: any) => {
    const oldKey = fields[idx].extractionKey;
    const oldName = fields[idx].name;

    setFields((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [key]: val };
      if (key === 'name' && (!copy[idx].extractionKey || copy[idx].extractionKey === toSlug(oldName))) {
        item.extractionKey = toSlug(val);
      }
      if (key === 'type' && val === 'select' && (!item.options || item.options.length === 0)) {
        item.options = ['Option 1', 'Option 2'];
      }
      if (key === 'type' && val === 'date' && !item.placeholder) {
        item.placeholder = 'e.g. 28-08-2026';
      }
      copy[idx] = item;
      return copy;
    });

    // If extractionKey changed, update auto-fill state
    if (key === 'name') {
      const newSlug = toSlug(val);
      if (baseFieldKey === oldKey) setBaseFieldKey(newSlug);
      if (targetFieldKeys.includes(oldKey)) {
        setTargetFieldKeys((prev) => prev.map((k) => (k === oldKey ? newSlug : k)));
      }
    }
  };

  const deleteField = (idx: number) => {
    const deleted = fields[idx];
    setFields((prev) => prev.filter((_, i) => i !== idx));

    if (baseFieldKey === deleted.extractionKey) {
      const remaining = fields.filter((_, i) => i !== idx);
      setBaseFieldKey(remaining[0]?.extractionKey || '');
    }
    setTargetFieldKeys((prev) => prev.filter((k) => k !== deleted.extractionKey));
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
      if (key === 'type' && val === 'select' && (!item.options || item.options.length === 0)) {
        item.options = ['Pass', 'Fail'];
      }
      copy[idx] = item;
      return copy;
    });
  };

  const deleteTableField = (idx: number) => {
    setTableFields((prev) => prev.filter((_, i) => i !== idx));
  };

  // CSV File Upload Handler
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setRawCsvText(content);
      const res = parseAutoFillCsv(content, baseFieldKey, targetFieldKeys, fields);
      if (res.manualEntries.length > 0) {
        setManualEntries(res.manualEntries);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Switch between CSV and Manual mode
  const handleSwitchSourceType = (newType: 'csv' | 'manual') => {
    if (newType === 'manual' && sourceType === 'csv' && rawCsvText.trim()) {
      const res = parseAutoFillCsv(rawCsvText, baseFieldKey, targetFieldKeys, fields);
      if (res.manualEntries.length > 0) {
        setManualEntries(res.manualEntries);
      }
    }
    setSourceType(newType);
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const sample = generateSampleCsv(baseFieldKey, targetFieldKeys, fields);
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${toSlug(name || 'template')}_autofill_sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manual Mapping Row Handlers
  const handleAddManualRow = () => {
    const emptyVals: Record<string, string> = {};
    targetFieldKeys.forEach((k) => (emptyVals[k] = ''));
    setManualEntries((prev) => [...prev, { baseValue: '', values: emptyVals }]);
  };

  const handleUpdateManualRow = (rowIdx: number, key: string, value: string) => {
    setManualEntries((prev) => {
      const copy = [...prev];
      if (key === '__base__') {
        copy[rowIdx] = { ...copy[rowIdx], baseValue: value };
      } else {
        copy[rowIdx] = {
          ...copy[rowIdx],
          values: { ...copy[rowIdx].values, [key]: value },
        };
      }
      return copy;
    });
  };

  const handleDeleteManualRow = (rowIdx: number) => {
    setManualEntries((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  // Toggle Target Field Selection
  const toggleTargetField = (key: string) => {
    setTargetFieldKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  // Test Lookup Simulation
  const mockTemplate: DataTemplate = {
    id: 'mock',
    name: name || 'Mock',
    fields,
    hasTable: false,
    tableFields: [],
    autoFill: {
      enabled: autoFillEnabled,
      baseFieldKey,
      targetFieldKeys,
      sourceType,
      mappings,
    },
    createdAt: '',
    updatedAt: '',
  };

  const testMatch = findAutoFillMatch(testBaseInput, mockTemplate);
  const baseFieldObj = fields.find((f) => f.extractionKey === baseFieldKey);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    if (autoFillEnabled) {
      const configToValidate: TemplateAutoFillConfig = {
        enabled: true,
        baseFieldKey,
        targetFieldKeys,
        sourceType,
        rawCsvText: sourceType === 'csv' ? rawCsvText : undefined,
        mappings,
        manualEntries,
      };

      const valResult = validateAutoFillConfig(configToValidate, fields);
      if (!valResult.isValid || autoFillErrors.length > 0) {
        setError(valResult.errors[0] || autoFillErrors[0] || 'Please resolve Auto-Fill configuration errors.');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const sanitizedFields = fields.map((f) => ({
        ...f,
        name: f.name.trim(),
        extractionKey: f.extractionKey.trim() || toSlug(f.name),
        options: f.type === 'select' && f.options ? f.options.filter(Boolean) : undefined,
      }));

      const sanitizedTableFields = hasTable
        ? tableFields.map((col) => ({
            ...col,
            name: col.name.trim(),
            extractionKey: col.extractionKey.trim() || toSlug(col.name),
            options: col.type === 'select' && col.options ? col.options.filter(Boolean) : undefined,
          }))
        : [];

      const autoFillConfig: TemplateAutoFillConfig | undefined = autoFillEnabled
        ? {
            enabled: true,
            baseFieldKey,
            targetFieldKeys,
            sourceType,
            rawCsvText: sourceType === 'csv' ? rawCsvText : undefined,
            mappings,
            manualEntries,
          }
        : undefined;

      const payload: DataTemplate = {
        id: template?.id || `template_custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault: template?.isDefault || false,
        fields: sanitizedFields,
        hasTable,
        tableTitle: hasTable ? tableTitle.trim() : undefined,
        tableFields: sanitizedTableFields,
        autoFill: autoFillConfig,
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
        <div className="p-4 sm:p-6 border-b border-cardBorder flex items-center justify-between bg-surface/50">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              {isEditing ? `Edit: ${template.name}` : 'Create Template'}
            </h2>
            <p className="text-[11px] sm:text-xs text-textMuted mt-0.5">
              Define fields, repeatable tables, and intelligent auto-fill rules.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-textMuted hover:text-text hover:bg-surface transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Template Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-cardBorder">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spare Parts Inventory"
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
                type="button"
                onClick={addField}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            <div className="space-y-2.5">
              {fields.map((f, idx) => (
                <div key={f.id || idx} className="p-3 rounded-xl bg-surface/50 border border-cardBorder space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">Field Label</label>
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => updateField(idx, 'name', e.target.value)}
                        placeholder="Field Label (e.g. Part No)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">AI Key</label>
                      <input
                        type="text"
                        value={f.extractionKey}
                        onChange={(e) => updateField(idx, 'extractionKey', e.target.value)}
                        placeholder="AI Key (e.g. part_no)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-textSubtle focus:outline-none focus:border-primary font-mono text-[11px]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-textSubtle font-medium block mb-0.5 sm:hidden">Type</label>
                      <select
                        value={f.type}
                        onChange={(e) => updateField(idx, 'type', e.target.value as FieldType)}
                        className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => deleteField(idx)}
                        className="text-textSubtle hover:text-danger p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {f.type === 'select' && (
                    <div className="p-2.5 rounded-lg bg-surface border border-cardBorder space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-dataColor">
                          Fixed Options (Comma-separated)
                        </label>
                      </div>
                      <input
                        type="text"
                        value={(f.options || []).join(', ')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const opts = raw.split(',').map((s) => s.trim()).filter(Boolean);
                          updateField(idx, 'options', opts);
                        }}
                        placeholder="e.g. High, Medium, Low"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-dataColor font-medium"
                      />
                    </div>
                  )}
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
                  <p className="text-[10px] sm:text-[11px] text-textMuted">Enable for repeated interval rows or line items.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasTable}
                onChange={(e) => setHasTable(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-cardBorder cursor-pointer"
              />
            </div>

            {hasTable && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-cardBorder space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                    Table Header Title
                  </label>
                  <input
                    type="text"
                    value={tableTitle}
                    onChange={(e) => setTableTitle(e.target.value)}
                    placeholder="e.g. Production Logs"
                    className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle">Table Columns</label>
                    <button
                      type="button"
                      onClick={addTableField}
                      className="text-xs text-dataColor hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Column
                    </button>
                  </div>

                  {tableFields.map((col, idx) => (
                    <div key={col.id || idx} className="p-2.5 rounded-xl bg-surface/50 border border-cardBorder space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
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

                        <div className="sm:col-span-3">
                          <select
                            value={col.type}
                            onChange={(e) => updateTableField(idx, 'type', e.target.value as FieldType)}
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.type} value={t.type}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => deleteTableField(idx)}
                            className="text-textSubtle hover:text-danger p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* AUTO-FILL FIELDS CONFIGURATION SECTION */}
          {/* ======================================================== */}
          <div className="space-y-4 pt-4 border-t border-cardBorder">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                    Auto-Fill Fields
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/15 text-primary border border-primary/30">
                      Smart Lookup
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-textMuted">
                    Automatically populate dependent fields when one Base Field is identified by Voice/OCR or typed.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFillEnabled}
                  onChange={(e) => setAutoFillEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-cardBorder"></div>
              </label>
            </div>

            {autoFillEnabled && (
              <div className="p-4 sm:p-5 rounded-2xl bg-surface/70 border border-cardBorder space-y-4 shadow-inner">
                {/* 1. Base Field & Target Fields Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Base Field */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-primary mb-1">
                      1. Base Field (Lookup Key) *
                    </label>
                    <select
                      value={baseFieldKey}
                      onChange={(e) => {
                        const newBase = e.target.value;
                        setBaseFieldKey(newBase);
                        setTargetFieldKeys((prev) => prev.filter((k) => k !== newBase));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Select Base Field --</option>
                      {fields.map((f) => (
                        <option key={f.extractionKey} value={f.extractionKey}>
                          {f.name} ({f.extractionKey})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-textMuted mt-1">
                      Example: Part No, Barcode, Employee ID, or Item Code.
                    </p>
                  </div>

                  {/* Auto-Fill Target Fields */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold uppercase text-primary mb-1">
                      2. Auto-Fill Fields (Populated Values) *
                    </label>
                    <div className="p-2.5 rounded-xl bg-background border border-cardBorder max-h-32 overflow-y-auto space-y-1.5">
                      {fields
                        .filter((f) => f.extractionKey !== baseFieldKey)
                        .map((f) => {
                          const isSelected = targetFieldKeys.includes(f.extractionKey);
                          return (
                            <label
                              key={f.extractionKey}
                              className={`flex items-center justify-between p-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                                isSelected
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : 'text-text hover:bg-surface'
                              }`}
                            >
                              <span>{f.name}</span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTargetField(f.extractionKey)}
                                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                              />
                            </label>
                          );
                        })}
                      {fields.filter((f) => f.extractionKey !== baseFieldKey).length === 0 && (
                        <p className="text-[10px] text-textSubtle p-1">Add more fields above to select as auto-fill targets.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Lookup Data Provider (CSV Upload vs Manual Entry) */}
                <div className="space-y-3 pt-2 border-t border-cardBorder/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase text-primary">
                      3. Provide Lookup Dataset
                    </label>

                    {/* Mode Tabs */}
                    <div className="flex items-center p-0.5 rounded-xl bg-background border border-cardBorder self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSwitchSourceType('csv')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                          sourceType === 'csv'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-textMuted hover:text-text'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchSourceType('manual')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                          sourceType === 'manual'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-textMuted hover:text-text'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Manual Entry
                      </button>
                    </div>
                  </div>

                  {/* CSV Mode */}
                  {sourceType === 'csv' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-dashed border-cardBorder bg-background/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-text">
                            Upload your lookup dataset (.csv)
                          </p>
                          <p className="text-[11px] text-textMuted">
                            Must include columns matching <strong className="text-text">{baseFieldObj?.name || 'Base Field'}</strong> and selected auto-fill fields.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadSampleCsv}
                            className="px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-text hover:text-primary text-xs font-semibold flex items-center gap-1 transition"
                            title="Download CSV format matching current fields"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Sample CSV
                          </button>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleCsvFileUpload}
                            className="hidden"
                            id="csv-file-upload-input"
                          />
                          <label
                            htmlFor="csv-file-upload-input"
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primaryDark to-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:from-primary hover:to-indigo-500 cursor-pointer flex items-center gap-1.5 transition"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Choose CSV File
                          </label>
                        </div>
                      </div>

                      {/* Raw CSV Textarea / Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-semibold text-textSubtle">
                            CSV Content & Direct Editor
                          </span>
                          <span className="text-[10px] text-textSubtle">
                            {Object.keys(mappings).length} mappings active
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={rawCsvText}
                          onChange={(e) => setRawCsvText(e.target.value)}
                          placeholder={`Part No,Description,Category,Price\n2345,Brake Pad,Automotive,450\n2346,Oil Filter,Automotive,250`}
                          className="w-full p-2.5 rounded-xl bg-background border border-cardBorder font-mono text-xs text-text focus:outline-none focus:border-primary resize-y"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Entry Table Mode */}
                  {sourceType === 'manual' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-textSubtle">
                          Mapping Rows ({manualEntries.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddManualRow}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Row
                        </button>
                      </div>

                      <div className="border border-cardBorder rounded-xl overflow-x-auto bg-background max-h-60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface/80 border-b border-cardBorder text-[10px] uppercase text-textSubtle font-bold">
                              <th className="p-2 pl-3">#</th>
                              <th className="p-2 text-primary font-extrabold">
                                {baseFieldObj?.name || 'Base Key'} *
                              </th>
                              {targetFieldKeys.map((k) => {
                                const f = fields.find((item) => item.extractionKey === k);
                                return (
                                  <th key={k} className="p-2">
                                    {f?.name || k}
                                  </th>
                                );
                              })}
                              <th className="p-2 pr-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cardBorder/60">
                            {manualEntries.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-surface/30">
                                <td className="p-2 pl-3 text-[10px] text-textSubtle font-mono">{rowIdx + 1}</td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={row.baseValue}
                                    onChange={(e) => handleUpdateManualRow(rowIdx, '__base__', e.target.value)}
                                    placeholder="Base Value"
                                    className="w-full px-2 py-1 rounded bg-surface border border-cardBorder text-xs text-text font-bold focus:outline-none focus:border-primary"
                                  />
                                </td>
                                {targetFieldKeys.map((k) => (
                                  <td key={k} className="p-1.5">
                                    <input
                                      type="text"
                                      value={row.values[k] ?? ''}
                                      onChange={(e) => handleUpdateManualRow(rowIdx, k, e.target.value)}
                                      placeholder="Auto Value"
                                      className="w-full px-2 py-1 rounded bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                                    />
                                  </td>
                                ))}
                                <td className="p-1.5 pr-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteManualRow(rowIdx)}
                                    className="text-textSubtle hover:text-danger p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Validation Alerts */}
                  {autoFillErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-danger font-bold text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Auto-Fill Validation Errors:</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-danger/90 pl-1 space-y-0.5">
                        {autoFillErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {autoFillWarnings.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-[11px] text-accent font-medium">
                      {autoFillWarnings.join(' | ')}
                    </div>
                  )}

                  {/* 3. Live Interactive Test Lookup Box */}
                  <div className="p-3.5 rounded-xl bg-background border border-cardBorder space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-secondary flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Interactive Lookup Tester
                      </span>
                      <span className="text-[10px] text-textSubtle">
                        Verify your rules in real-time
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={testBaseInput}
                          onChange={(e) => setTestBaseInput(e.target.value)}
                          placeholder={`Type test ${baseFieldObj?.name || 'Base Field'} value...`}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-secondary font-mono"
                        />
                      </div>
                    </div>

                    {testMatch.matchFound && testMatch.matchedValues ? (
                      <div className="p-2.5 rounded-lg bg-secondary/15 border border-secondary/30 text-xs text-text space-y-1 animate-fade-in">
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                          <span>Lookup Matched for &quot;{testBaseInput}&quot;</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {targetFieldKeys.map((tk) => {
                            const f = fields.find((item) => item.extractionKey === tk);
                            return (
                              <div
                                key={tk}
                                className="px-2 py-1 rounded-md bg-background border border-cardBorder text-[11px] font-medium"
                              >
                                <span className="text-textSubtle font-mono mr-1">{f?.name || tk}:</span>
                                <strong className="text-text font-bold">
                                  {String(testMatch.matchedValues?.[tk] ?? '—')}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : testBaseInput.trim() ? (
                      <div className="p-2 rounded-lg bg-surface border border-cardBorder text-[11px] text-textMuted flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-textSubtle" />
                        <span>No lookup match found in dataset for &quot;{testBaseInput}&quot;.</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-cardBorder bg-surface/50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-cardBorder text-textMuted hover:text-text hover:bg-surface text-xs font-semibold transition cursor-pointer"
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
