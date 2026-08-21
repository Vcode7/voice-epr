'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Trash2,
  Layers,
  Sparkles,
  Volume2,
  Calendar,
  Clock,
  Table as TableIcon,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { DataEntryRecord, SessionDataEntry, UserSettings, DataTemplate } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateUtils';
import { exportEntriesToExcel } from '@/lib/utils/excelExporter';
import { PrintableEntriesReport } from '@/components/voice/PrintableEntriesReport';
import { VoiceAudioPlayer } from '@/components/voice/VoiceAudioPlayer';

interface BatchDataEntryViewModalProps {
  record: DataEntryRecord;
  settings?: UserSettings | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function BatchDataEntryViewModal({
  record,
  settings,
  onClose,
  onDeleted,
}: BatchDataEntryViewModalProps) {
  // Normalize child entries (fallback for legacy records that didn't have entries array)
  const childEntries: SessionDataEntry[] = React.useMemo(() => {
    if (record.entries && Array.isArray(record.entries) && record.entries.length > 0) {
      return record.entries;
    }
    // Single entry fallback
    return [
      {
        id: record.id,
        entryNumber: 1,
        mode: record.isFlexible ? 'flexible' : 'template',
        templateId: record.templateId,
        templateName: record.templateName,
        title: record.title || record.templateName,
        fieldValues: record.fieldValues || {},
        flexibleFields: record.flexibleFields,
        tableTitle: record.tableTitle,
        tableHeaders: record.tableHeaders,
        tableRows: record.tableRows || [],
        rawTranscript: record.rawTranscript,
        createdAt: record.createdAt,
      },
    ];
  }, [record]);

  // For selective printing (either all or specific entry)
  const [printEntries, setPrintEntries] = useState<SessionDataEntry[]>(childEntries);
  const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Print all entries in batch
  const handlePrintAll = () => {
    setPrintEntries(childEntries);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print a specific individual entry
  const handlePrintSingle = (entry: SessionDataEntry) => {
    setPrintEntries([entry]);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Export all entries in batch to Excel
  const handleExportAllToExcel = () => {
    const filename = record.title
      ? record.title.replace(/\s+/g, '_')
      : `${record.templateName || 'EPR'}_Batch`;
    exportEntriesToExcel(childEntries, filename);
  };

  // Export a specific individual entry to Excel
  const handleExportSingleToExcel = (entry: SessionDataEntry) => {
    const baseTitle = record.title
      ? record.title.replace(/\s+/g, '_')
      : record.templateName || 'EPR';
    exportEntriesToExcel([entry], `${baseTitle}_Entry_${entry.entryNumber}`);
  };

  // Delete parent record
  const handleDeleteParent = async () => {
    if (
      !confirm(
        `Are you sure you want to delete this parent batch record ("${
          record.title || record.templateName
        }") and all its ${childEntries.length} child entries?`
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      await fetch(`/api/data-entries/${record.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Printable Area (visible only during print) */}
      <PrintableEntriesReport entries={printEntries} settings={settings} />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
        <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="p-4 sm:p-6 border-b border-cardBorder bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono">
                  Parent History Record
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                  {childEntries.length} {childEntries.length === 1 ? 'Child Entry' : 'Child Entries'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text mt-1 truncate">
                {record.title || record.templateName || 'EPR Session Record'}
              </h2>
              <div className="flex items-center gap-4 text-xs text-textMuted mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-textSubtle" />
                  {formatDateDisplay(record.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-textSubtle" />
                  {new Date(record.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Global Actions on Entire Batch */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
              {/* Print All */}
              <button
                onClick={handlePrintAll}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hover:border-cyan-500/50"
                title="Print all child entries in this record"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print All ({childEntries.length})</span>
              </button>

              {/* Export All to Excel */}
              <button
                onClick={handleExportAllToExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Export all child entries to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export All Excel</span>
              </button>

              {/* Delete Record */}
              <button
                onClick={handleDeleteParent}
                disabled={deleting}
                className="p-2 rounded-xl bg-slate-800 hover:bg-danger/20 hover:text-danger text-textSubtle border border-cardBorder text-xs transition cursor-pointer"
                title="Delete this entire record from database"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close Modal */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-textSubtle hover:text-text border border-cardBorder text-xs transition cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body: Scrollable Child Entries List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-background/50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-textSubtle tracking-wider">
                Contained Individual Child Entries ({childEntries.length})
              </h3>
              <span className="text-[11px] text-textMuted">
                Each entry can be printed or exported independently below
              </span>
            </div>

            {childEntries.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="bg-card border border-cardBorder rounded-xl p-4 sm:p-5 shadow-sm space-y-3 hover:border-slate-600 transition"
              >
                {/* Entry Header & Specific Per-Entry Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cardBorder/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-black text-xs">
                      Entry {entry.entryNumber || idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-text">
                      {entry.title || entry.templateName || (entry.mode === 'flexible' ? 'Flexible Dictation' : 'Template Form')}
                    </span>
                    <span className="text-[10px] text-textSubtle font-mono">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Actions for this specific individual entry */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Audio recording button */}
                    {entry.audioUrl && (
                      <button
                        onClick={() =>
                          setExpandedAudioId((prev) => (prev === (entry.id || String(idx)) ? null : (entry.id || String(idx))))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                          expandedAudioId === (entry.id || String(idx))
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Play Audio</span>
                      </button>
                    )}

                    {/* Print single entry */}
                    <button
                      onClick={() => handlePrintSingle(entry)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-semibold flex items-center gap-1 transition cursor-pointer hover:border-cyan-500/50"
                      title="Print only this specific entry"
                    >
                      <Printer className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px]">Print Entry</span>
                    </button>

                    {/* Export single entry */}
                    <button
                      onClick={() => handleExportSingleToExcel(entry)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Export only this specific entry to Excel"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px]">Excel</span>
                    </button>
                  </div>
                </div>

                {/* Inline Audio Player if expanded */}
                {expandedAudioId === (entry.id || String(idx)) && entry.audioUrl && (
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-cardBorder">
                    <VoiceAudioPlayer audioUrl={entry.audioUrl} />
                  </div>
                )}

                {/* Voice Transcript Quote */}
                {entry.rawTranscript && (
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border-l-2 border-cyan-500 text-xs text-textMuted italic flex items-start gap-2">
                    <span className="text-[10px] font-bold uppercase not-italic text-cyan-400 shrink-0">
                      Voice Dictation:
                    </span>
                    <span className="text-slate-300">"{entry.rawTranscript}"</span>
                  </div>
                )}

                {/* Structured Fields & Values */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-textSubtle mb-1.5">
                    Field Values
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                    {entry.mode === 'flexible' && entry.flexibleFields && entry.flexibleFields.length > 0 ? (
                      entry.flexibleFields.map((f, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900/90 border border-cardBorder/60">
                          <span className="text-[10px] text-textSubtle uppercase font-semibold block truncate">
                            {f.name}
                          </span>
                          <span className="font-bold text-text block truncate mt-0.5">
                            {String(f.value !== undefined && f.value !== null && f.value !== '' ? f.value : '-')}
                          </span>
                        </div>
                      ))
                    ) : (
                      Object.entries(entry.fieldValues || {}).map(([k, v], i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900/90 border border-cardBorder/60">
                          <span className="text-[10px] text-textSubtle uppercase font-semibold block truncate">
                            {k}
                          </span>
                          <span className="font-bold text-text block truncate mt-0.5">
                            {String(v !== undefined && v !== null && v !== '' ? v : '-')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Table Rows (if present) */}
                {entry.tableRows && entry.tableRows.length > 0 && (
                  <div className="pt-2 border-t border-cardBorder/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-textSubtle">
                      <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] font-bold uppercase">
                        {entry.tableTitle || 'Table Data'} ({entry.tableRows.length} rows)
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-cardBorder rounded-lg bg-slate-950/40">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-textSubtle font-bold border-b border-cardBorder">
                          <tr>
                            <th className="p-2 w-8 text-center">#</th>
                            {entry.tableHeaders && entry.tableHeaders.length > 0 ? (
                              entry.tableHeaders.map((h, i) => (
                                <th key={i} className="p-2">{h}</th>
                              ))
                            ) : Array.isArray(entry.tableRows[0]) ? (
                              (entry.tableRows[0] as any[]).map((_, i) => (
                                <th key={i} className="p-2">Col {i + 1}</th>
                              ))
                            ) : (
                              Object.keys(entry.tableRows[0] || {}).map((k) => (
                                <th key={k} className="p-2">{k}</th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cardBorder/40">
                          {entry.tableRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-800/40">
                              <td className="p-2 text-center text-textSubtle font-mono text-[10px]">{rowIdx + 1}</td>
                              {Array.isArray(row) ? (
                                row.map((cell, colIdx) => (
                                  <td key={colIdx} className="p-2 font-medium text-text">{String(cell ?? '')}</td>
                                ))
                              ) : (
                                Object.values(row).map((cell, colIdx) => (
                                  <td key={colIdx} className="p-2 font-medium text-text">{String(cell ?? '')}</td>
                                ))
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-6 border-t border-cardBorder bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs text-textMuted">
              Parent ID: <code className="font-mono text-[11px] text-textSubtle">{record.id}</code>
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-bold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
