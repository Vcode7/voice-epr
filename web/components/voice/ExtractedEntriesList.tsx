'use client';

import React, { useState } from 'react';
import {
  Save,
  Printer,
  FileSpreadsheet,
  Trash2,
  Plus,
  Edit2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Sparkles,
  Layers,
  AlertCircle,
  Table as TableIcon,
  X,
  Loader2,
  Mic,
  Radio,
  Square,
} from 'lucide-react';
import { SessionDataEntry, DataTemplate, TemplateField } from '@/types';
import { VoiceAudioPlayer } from '@/components/voice/VoiceAudioPlayer';
import { normalizeDateToDDMMYYYY, isDateField } from '@/lib/utils/dateUtils';

interface ExtractedEntriesListProps {
  entries: SessionDataEntry[];
  templates: DataTemplate[];
  activeTemplate: DataTemplate;
  isSaving: boolean;
  // Live Recording / Extraction state for pending entry
  isRecording?: boolean;
  isProcessing?: boolean;
  processingStatus?: string;
  dataMode?: 'template' | 'flexible';
  // Actions
  onSaveAll: () => void;
  onPrint: () => void;
  onExportExcel: () => void;
  onClearAll: () => void;
  onAddManualEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntryField: (entryId: string, fieldKey: string, value: any) => void;
  onUpdateFlexibleField: (entryId: string, fieldIdx: number, key: 'name' | 'value', value: any) => void;
  onAddFlexibleField: (entryId: string) => void;
  onDeleteFlexibleField: (entryId: string, fieldIdx: number) => void;
  onUpdateTableRow: (entryId: string, rowIdx: number, colKey: string | number, value: any) => void;
  onAddTableRow: (entryId: string) => void;
  onDeleteTableRow: (entryId: string, rowIdx: number) => void;
  // Voice editing on existing entry
  onVoiceEditEntry?: (entryId: string) => void;
  activeVoiceEditingId?: string | null;
  isVoiceEditingProcessing?: boolean;
  voiceEditingStatus?: string;
  lastEditedNotification?: { entryId: string; message: string } | null;
}

export function ExtractedEntriesList({
  entries,
  templates,
  activeTemplate,
  isSaving,
  isRecording = false,
  isProcessing = false,
  processingStatus = '',
  dataMode = 'template',
  onSaveAll,
  onPrint,
  onExportExcel,
  onClearAll,
  onAddManualEntry,
  onDeleteEntry,
  onUpdateEntryField,
  onUpdateFlexibleField,
  onAddFlexibleField,
  onDeleteFlexibleField,
  onUpdateTableRow,
  onAddTableRow,
  onDeleteTableRow,
  onVoiceEditEntry,
  activeVoiceEditingId = null,
  isVoiceEditingProcessing = false,
  voiceEditingStatus = '',
  lastEditedNotification = null,
}: ExtractedEntriesListProps) {
  const [expandedAudioEntryId, setExpandedAudioEntryId] = useState<string | null>(null);

  const isPending = isRecording || isProcessing;
  const nextEntryNumber = entries.length + 1;

  return (
    <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4 h-full">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cardBorder/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text tracking-wide">
              Extracted Data Entries
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
            {isPending && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger/20 text-danger border border-danger/30 text-[11px] font-bold animate-pulse">
                <Radio className="w-3 h-3 animate-spin" />
                <span>Entry #{nextEntryNumber} {isProcessing ? 'Extracting' : 'Recording'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-textMuted mt-0.5">
            Entries accumulate here. Review &amp; edit before saving, printing, or exporting.
          </p>
        </div>

        {/* Global Actions on Left Panel */}
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <>
              {/* Save All */}
              <button
                onClick={onSaveAll}
                disabled={isSaving || isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30 hover:ring-emerald-400 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Save all entries to database and clear session"
              >
                <Save className="w-4 h-4 text-white stroke-[2.5]" />
                <span>{isSaving ? 'Saving...' : 'Save All'}</span>
              </button>

              {/* Print */}
              <button
                onClick={onPrint}
                disabled={isPending}
                className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hover:border-dataColor/50 shadow-sm disabled:opacity-50 active:scale-95"
                title="Print clean multi-entry report"
              >
                <Printer className="w-3.5 h-3.5 text-dataColor" />
                <span>Print</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={onExportExcel}
                disabled={isPending}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
                title="Export all displayed entries to Excel (.xlsx / .xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export Excel</span>
              </button>

              {/* Clear All */}
              <button
                onClick={onClearAll}
                disabled={isPending}
                className="p-2 rounded-xl bg-surface hover:bg-danger/15 hover:text-danger text-textSubtle border border-cardBorder hover:border-danger/30 text-xs transition cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
                title="Clear all current session entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Quick Add Manual Entry */}
          <button
            onClick={onAddManualEntry}
            disabled={isPending}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-dataColor text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hover:border-dataColor/50 shadow-sm disabled:opacity-50 active:scale-95"
            title="Add a new blank entry"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Entries Stack / List */}
      {entries.length === 0 && !isPending ? (
        <div className="py-16 text-center text-xs text-textMuted bg-surface/40 rounded-xl border border-dashed border-cardBorder p-6 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-dataColor border border-cardBorder">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-text text-sm">No entries recorded in this session</p>
            <p className="text-textSubtle text-xs mt-1 max-w-sm">
              Tap the microphone on the right panel to dictate, or click <strong>&quot;+ Add Entry&quot;</strong>.
              Every recording will create a new separate entry here!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {/* Render already finalized previous entries */}
          {entries.map((entry) => {
            const template =
              entry.mode === 'template'
                ? templates.find((t) => t.id === entry.templateId) || activeTemplate
                : null;

            return (
              <div
                key={entry.id}
                className="bg-surface/80 border border-cardBorder rounded-xl p-4 shadow-sm hover:border-primary/40 transition space-y-3 relative group"
              >
                {/* Entry Header */}
                <div className="flex items-center justify-between border-b border-cardBorder/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-dataColor text-white font-mono font-extrabold text-xs">
                      Entry {entry.entryNumber}
                    </span>
                    <span className="text-xs font-bold text-text truncate">
                      {entry.title || entry.templateName || (entry.mode === 'flexible' ? 'Flexible Record' : 'Template Form')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-textSubtle border border-cardBorder hidden sm:inline-block">
                      {entry.mode === 'flexible' ? 'Flexible' : 'Template'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Voice Edit Button */}
                    {onVoiceEditEntry && (
                      <button
                        onClick={() => onVoiceEditEntry(entry.id)}
                        disabled={isPending || (activeVoiceEditingId !== null && activeVoiceEditingId !== entry.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border shadow-sm ${
                          activeVoiceEditingId === entry.id
                            ? 'bg-danger text-white border-danger animate-pulse'
                            : 'bg-surface text-dataColor hover:bg-surfaceMuted border-cardBorder hover:border-dataColor/50'
                        } disabled:opacity-50`}
                        title="Click to speak and edit a field in this entry"
                      >
                        <Mic className="w-3 h-3" />
                        <span className="text-[10px]">
                          {activeVoiceEditingId === entry.id ? 'Recording...' : 'Edit with Voice'}
                        </span>
                      </button>
                    )}

                    {entry.audioUrl && (
                      <button
                        onClick={() =>
                          setExpandedAudioEntryId((prev) => (prev === entry.id ? null : entry.id))
                        }
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border ${
                          expandedAudioEntryId === entry.id
                            ? 'bg-dataColor text-white border-dataColor'
                            : 'bg-surface text-dataColor hover:bg-surfaceMuted border-cardBorder'
                        }`}
                        title="Play audio recording"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">Audio</span>
                      </button>
                    )}

                    <span className="text-[10px] text-textSubtle font-mono mr-1">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-danger/15 hover:text-danger text-textSubtle border border-cardBorder hover:border-danger/30 transition cursor-pointer"
                      title="Delete this entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Active Voice Editing State for this entry */}
                {activeVoiceEditingId === entry.id && (
                  <div className="p-3 bg-danger/10 border border-danger/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text animate-fade-in shadow-inner">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-danger animate-ping shrink-0" />
                      <div>
                        <span className="font-bold text-danger">Voice Editing Entry #{entry.entryNumber}:</span>{' '}
                        <span className="text-textMuted text-[11px]">
                          {isVoiceEditingProcessing
                            ? voiceEditingStatus || 'Processing voice edit with AI...'
                            : 'Speak the field to change (e.g., "Part No 341" or "OK Qty 20")'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {isVoiceEditingProcessing ? (
                        <div className="flex items-center gap-1 text-dataColor font-bold text-xs px-2 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onVoiceEditEntry && onVoiceEditEntry(entry.id)}
                          className="px-3 py-1.5 rounded-lg bg-danger hover:bg-danger/90 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop &amp; Update</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Success Notification Badge */}
                {lastEditedNotification?.entryId === entry.id && (
                  <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{lastEditedNotification.message}</span>
                  </div>
                )}

                {/* Inline Audio Player for this entry */}
                {expandedAudioEntryId === entry.id && entry.audioUrl && (
                  <div className="p-2 bg-surface/90 rounded-lg border border-cardBorder">
                    <VoiceAudioPlayer audioUrl={entry.audioUrl} />
                  </div>
                )}

                {/* Voice Transcript Quote */}
                {entry.rawTranscript && (
                  <div className="p-2 bg-surface border border-cardBorder border-l-2 border-l-dataColor rounded-lg text-xs text-textMuted italic flex items-start gap-1.5">
                    <span className="text-[10px] font-bold uppercase not-italic text-dataColor shrink-0">
                      Transcript:
                    </span>
                    <span className="text-text font-medium">&quot;{entry.rawTranscript}&quot;</span>
                  </div>
                )}

                {/* Editable Fields Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-textSubtle uppercase tracking-wider">
                      Fields &amp; Values
                    </span>
                    {entry.mode === 'flexible' && (
                      <button
                        onClick={() => onAddFlexibleField(entry.id)}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Field</span>
                      </button>
                    )}
                  </div>

                  {/* Mode 1: Template Fields */}
                  {entry.mode === 'template' && template && (
                    <div className="space-y-3">
                      {/* Invalid Lookup Alert Banner */}
                      {entry.invalidLookup && entry.invalidLookupMessage && (
                        <div className="p-2.5 rounded-lg bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{entry.invalidLookupMessage}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {template.fields.map((field) => {
                          const val = entry.fieldValues?.[field.extractionKey];
                          const isBase = template.autoFill?.enabled && template.autoFill.baseFieldKey === field.extractionKey;
                          const isTarget = template.autoFill?.enabled && template.autoFill.targetFieldKeys.includes(field.extractionKey);
                          const isDate = field.type === 'date' || isDateField(field.extractionKey) || isDateField(field.name);

                          if (field.type === 'select' || (field.options && field.options.length > 0)) {
                            return (
                              <div key={field.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-textSubtle uppercase truncate block">
                                    {field.name}
                                  </label>
                                  {isTarget && val && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                      ✨ Auto-filled
                                    </span>
                                  )}
                                </div>
                                <select
                                  value={val ?? ''}
                                  onChange={(e) => onUpdateEntryField(entry.id, field.extractionKey, e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-dataColor font-medium"
                                >
                                  <option value="" className="text-textSubtle">
                                    Select {field.name}...
                                  </option>
                                  {(field.options || []).map((opt) => (
                                    <option key={opt} value={opt} className="text-text">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          if (field.type === 'boolean') {
                            const isChecked = val === true || val === 'true' || val === 'yes' || val === '1';
                            return (
                              <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-bold text-textSubtle uppercase truncate block">
                                  {field.name}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntryField(entry.id, field.extractionKey, !isChecked)}
                                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isChecked
                                      ? 'bg-success/20 text-success border border-success/40'
                                      : 'bg-background text-textSubtle border border-cardBorder'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isChecked ? 'YES / PASS' : 'NO / FAIL'}</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div key={field.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-textSubtle uppercase truncate block">
                                  {field.name}
                                </label>
                                {isBase && entry.lookupStatus === 'valid' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-success/15 text-success border border-success/30">
                                    ✓ Lookup Match
                                  </span>
                                )}
                                {isBase && entry.invalidLookup && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-danger/20 text-danger border border-danger/40 animate-pulse">
                                    ⚠️ Not in Lookup
                                  </span>
                                )}
                                {isTarget && val && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    ✨ Auto-filled
                                  </span>
                                )}
                              </div>
                              <input
                                type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'}
                                value={val ?? ''}
                                onChange={(e) => onUpdateEntryField(entry.id, field.extractionKey, e.target.value)}
                                onBlur={(e) => {
                                  if (isDate) {
                                    onUpdateEntryField(entry.id, field.extractionKey, normalizeDateToDDMMYYYY(e.target.value));
                                  }
                                }}
                                placeholder={isDate ? 'DD-MM-YYYY (e.g. 28-08-2026)' : (field.placeholder || `Enter ${field.name}...`)}
                                className={`w-full px-2.5 py-1.5 rounded-lg bg-background border text-xs text-text focus:outline-none font-medium transition ${
                                  isBase && entry.invalidLookup
                                    ? 'border-danger focus:border-danger ring-1 ring-danger/30'
                                    : 'border-cardBorder focus:border-dataColor'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Flexible Fields */}
                  {entry.mode === 'flexible' && (
                    <div className="space-y-2">
                      {entry.flexibleFields && entry.flexibleFields.length > 0 ? (
                        entry.flexibleFields.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={f.name}
                              onChange={(e) =>
                                onUpdateFlexibleField(entry.id, idx, 'name', e.target.value)
                              }
                              placeholder="Field Name"
                              className="w-1/3 px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
                            />
                            <input
                              type="text"
                              value={String(f.value ?? '')}
                              onChange={(e) =>
                                onUpdateFlexibleField(entry.id, idx, 'value', e.target.value)
                              }
                              placeholder="Field Value"
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              onClick={() => onDeleteFlexibleField(entry.id, idx)}
                              className="p-1.5 rounded-lg bg-surface hover:bg-danger/15 hover:text-danger text-textSubtle border border-cardBorder hover:border-danger/30 transition cursor-pointer shrink-0"
                              title="Delete field"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-textMuted italic">No fields extracted.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Editable Table Rows (if template has table or flexible table) */}
                {((entry.mode === 'template' && template?.hasTable) || (entry.mode === 'flexible' && entry.tableRows && entry.tableRows.length > 0)) && (
                  <div className="pt-2 border-t border-cardBorder/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[11px] font-bold text-textSubtle uppercase tracking-wider">
                          {entry.tableTitle || template?.tableTitle || 'Repeated Entries'} ({entry.tableRows?.length || 0} rows)
                        </span>
                      </div>
                      <button
                        onClick={() => onAddTableRow(entry.id)}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    {entry.tableRows && entry.tableRows.length > 0 ? (
                      <div className="overflow-x-auto border border-cardBorder rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-surface text-textSubtle font-bold border-b border-cardBorder">
                            <tr>
                              <th className="p-2 w-8 text-center">#</th>
                              {entry.mode === 'template' && template?.tableFields ? (
                                template.tableFields.map((tf) => (
                                  <th key={tf.id} className="p-2">{tf.name}</th>
                                ))
                              ) : entry.tableHeaders ? (
                                entry.tableHeaders.map((h, i) => (
                                  <th key={i} className="p-2">{h}</th>
                                ))
                              ) : null}
                              <th className="p-2 w-8 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cardBorder/40">
                            {entry.tableRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-surface/60 transition-colors">
                                <td className="p-2 text-center text-textSubtle font-mono text-[10px]">{rowIdx + 1}</td>
                                {entry.mode === 'template' && template?.tableFields ? (
                                  template.tableFields.map((tf) => (
                                    <td key={tf.id} className="p-1.5">
                                      {tf.type === 'select' || (tf.options && tf.options.length > 0) ? (
                                        <select
                                          value={(row as Record<string, any>)?.[tf.extractionKey] ?? ''}
                                          onChange={(e) =>
                                            onUpdateTableRow(entry.id, rowIdx, tf.extractionKey, e.target.value)
                                          }
                                          className="w-full px-2 py-1 rounded bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-dataColor"
                                        >
                                          <option value="" className="text-textSubtle">
                                            Select...
                                          </option>
                                          {(tf.options || []).map((opt) => (
                                            <option key={opt} value={opt} className="text-text">
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={tf.type === 'number' ? 'number' : tf.type === 'time' ? 'time' : 'text'}
                                          value={(row as Record<string, any>)?.[tf.extractionKey] ?? ''}
                                          onChange={(e) =>
                                            onUpdateTableRow(entry.id, rowIdx, tf.extractionKey, e.target.value)
                                          }
                                          className="w-full px-2 py-1 rounded bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-dataColor"
                                          placeholder={tf.placeholder || tf.name}
                                        />
                                      )}
                                    </td>
                                  ))
                                ) : Array.isArray(row) ? (
                                  row.map((cell, colIdx) => (
                                    <td key={colIdx} className="p-1.5">
                                      <input
                                        type="text"
                                        value={String(cell ?? '')}
                                        onChange={(e) =>
                                          onUpdateTableRow(entry.id, rowIdx, colIdx, e.target.value)
                                        }
                                        className="w-full px-2 py-1 rounded bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-dataColor"
                                      />
                                    </td>
                                  ))
                                ) : null}
                                <td className="p-1.5 text-center">
                                  <button
                                    onClick={() => onDeleteTableRow(entry.id, rowIdx)}
                                    className="p-1 rounded bg-surface hover:bg-danger/15 hover:text-danger text-textSubtle border border-cardBorder hover:border-danger/30 transition cursor-pointer"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-xs text-textMuted italic p-2 bg-surface/50 border border-cardBorder rounded-lg">
                        No table rows yet. Click &quot;+ Add Row&quot; or dictate hourly logs.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ========================================================================= */}
          {/* LIVE EXTRACTION / SKELETON LOADING PREVIEW CARD (While Recording/Extracting) */}
          {/* ========================================================================= */}
          {isPending && (
            <div className="bg-surface border-2 border-dataColor/50 rounded-xl p-4 shadow-xl shadow-dataColor/10 space-y-3 relative overflow-hidden animate-fade-in">
              {/* Top Shimmer Header */}
              <div className="flex items-center justify-between border-b border-cardBorder/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-dataColor text-white font-mono font-extrabold text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Entry {nextEntryNumber}
                  </span>
                  <span className="text-xs font-bold text-dataColor truncate">
                    {dataMode === 'template' ? activeTemplate.name : 'Flexible Voice Extraction'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-dataColor/15 text-dataColor border border-dataColor/30 font-semibold animate-pulse">
                    {isProcessing ? 'Extracting Data...' : 'Listening to Speech...'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[11px] font-mono font-semibold">
                    {isProcessing ? (processingStatus || 'AI Extracting...') : 'Live Audio Stream'}
                  </span>
                </div>
              </div>

              {/* TEMPLATE EXTRACTION: Show Template Structure Preview & Field Skeletons */}
              {dataMode === 'template' ? (
                <div className="space-y-3">
                  {/* Informative Preview Header */}
                  <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-text block">
                          Template Output Structure Preview
                        </span>
                        <span className="text-[10px] text-cyan-300/80 block truncate">
                          Listening for "{activeTemplate.name}" fields &amp; parameters...
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-cardBorder text-dataColor font-mono shrink-0">
                      {activeTemplate.fields.length} target fields
                    </span>
                  </div>

                  {/* Template Field Skeletons */}
                  <div>
                    <div className="text-[11px] font-bold text-dataColor uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>Target Fields (Waiting for Speech Extractor)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {activeTemplate.fields.map((field) => (
                        <div key={field.id} className="space-y-1 p-2 rounded-lg bg-surface/70 border border-cardBorder">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-textSubtle uppercase truncate">
                              {field.name}
                            </label>
                            <span className="text-[9px] font-mono text-dataColor/80 lowercase">
                              {field.type}
                            </span>
                          </div>
                          {/* Skeleton Animated Value Placeholder */}
                          <div className="skeleton-shimmer h-7 rounded flex items-center px-2 text-[10px] text-dataColor font-mono italic">
                            <span className="opacity-75 truncate">Listening for {field.name}...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table Structure Preview (if template has table) */}
                  {activeTemplate.hasTable && activeTemplate.tableFields?.length > 0 && (
                    <div className="pt-2 border-t border-cardBorder/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-textSubtle">
                        <TableIcon className="w-3.5 h-3.5 text-dataColor" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {activeTemplate.tableTitle || 'Repeated Entries Table'} (Preview)
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-cardBorder rounded-lg bg-surface/40">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-surface text-textSubtle font-bold border-b border-cardBorder">
                            <tr>
                              <th className="p-1.5 w-8 text-center">#</th>
                              {activeTemplate.tableFields.map((tf) => (
                                <th key={tf.id} className="p-1.5">{tf.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-1.5 text-center text-textSubtle font-mono text-[10px]">1</td>
                              {activeTemplate.tableFields.map((tf) => (
                                <td key={tf.id} className="p-1.5">
                                  <div className="skeleton-shimmer h-6 rounded" />
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* FLEXIBLE EXTRACTION: Minimalist loading state, no template fields */
                <div className="py-6 px-4 rounded-xl bg-surface border border-cardBorder text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-dataColor/20 text-dataColor flex items-center justify-center border border-dataColor/40">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text">
                      Extracting Flexible Schema...
                    </h4>
                    <p className="text-[11px] text-textSubtle mt-0.5 max-w-xs">
                      {isProcessing ? processingStatus : 'Autonomous schema detector will generate fields from speech.'}
                    </p>
                  </div>
                  <div className="w-3/4 skeleton-shimmer h-2 rounded-full mt-1" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
