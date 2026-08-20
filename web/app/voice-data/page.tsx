'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Mic,
  Square,
  Edit3,
  Layers,
  Settings2,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useWebAudioRecorder } from '@/hooks/useWebAudioRecorder';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';
import { DataTemplate, DataEntryRecord, ExtractedDataResult, FlexibleExtractedResult } from '@/types';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE } from '@/lib/constants';
import { formatDateDisplay } from '@/lib/utils/dateUtils';
import { DataEntryEditModal } from '@/components/modals/DataEntryEditModal';
import { TemplateManagerModal } from '@/components/modals/TemplateManagerModal';

export default function VoiceDataPage() {
  const [dataMode, setDataMode] = useState<'flexible' | 'template'>('flexible');
  const [templates, setTemplates] = useState<DataTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<DataTemplate>(DEFAULT_MONITORING_DETAILS_TEMPLATE);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Result / Edit Modals
  const [modalMode, setModalMode] = useState<{
    isOpen: boolean;
    isManual?: boolean;
    extractedData?: ExtractedDataResult;
    flexibleData?: FlexibleExtractedResult;
    existingRecord?: DataEntryRecord;
  }>({ isOpen: false });

  // Voice recording & extraction state
  const recorder = useWebAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Records list
  const [records, setRecords] = useState<DataEntryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('All');
  const [loadingRecords, setLoadingRecords] = useState(true);

  const fetchTemplatesAndRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const [tmplRes, recRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/data-entries'),
      ]);
      const tmplData = await tmplRes.json();
      const recData = await recRes.json();

      if (Array.isArray(tmplData) && tmplData.length > 0) {
        setTemplates(tmplData);
        const def = tmplData.find((t: DataTemplate) => t.isDefault) || tmplData[0];
        setActiveTemplate((prev) => (prev.id === DEFAULT_MONITORING_DETAILS_TEMPLATE.id ? def : prev));
      }
      if (Array.isArray(recData)) setRecords(recData);
    } catch (e) {
      console.error('Failed to load templates or records:', e);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplatesAndRecords();
  }, [fetchTemplatesAndRecords]);

  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const blob = await recorder.stopRecording();
      if (!blob) return;

      try {
        setIsProcessing(true);
        recorder.setState('Transcribing');
        setProcessingStatus('Transcribing speech with Whisper AI...');

        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');

        const transcribeRes = await fetch('/api/groq/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!transcribeRes.ok) {
          const errData = await transcribeRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Audio transcription failed.');
        }

        const { text } = await transcribeRes.json();
        recorder.setState('Understanding');
        setProcessingStatus('Extracting structured EPR entities...');

        if (dataMode === 'flexible') {
          const res = await fetch('/api/groq/flexible', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: text }),
          });
          const data: FlexibleExtractedResult = await res.json();
          setModalMode({ isOpen: true, flexibleData: data, isManual: false });
        } else {
          const res = await fetch('/api/groq/custom-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: text, template: activeTemplate }),
          });
          const data: ExtractedDataResult = await res.json();
          setModalMode({ isOpen: true, extractedData: data, isManual: false });
        }

        recorder.resetRecorder();
      } catch (err: any) {
        console.error('Voice-to-Data Processing Error:', err);
        recorder.setErrorMessage(err.message || 'Processing failed. Please try again.');
        recorder.setState('Error');
      } finally {
        setIsProcessing(false);
      }
    } else {
      await recorder.startRecording();
    }
  };

  const handleOpenManualEntry = () => {
    setModalMode({
      isOpen: true,
      isManual: true,
      flexibleData: dataMode === 'flexible' ? { isFlexible: true, title: 'Manual Flexible Record', fields: [], raw_transcript: '[Manual Entry]' } : undefined,
    });
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this EPR record?')) return;
    await fetch(`/api/data-entries/${id}`, { method: 'DELETE' });
    fetchTemplatesAndRecords();
  };

  const filteredRecords = records.filter((r) => {
    if (filterTemplate === 'flexible') {
      if (!r.isFlexible && r.templateId !== 'flexible' && !r.flexibleFields) return false;
    } else if (filterTemplate !== 'All') {
      if (r.templateId !== filterTemplate && r.templateName !== filterTemplate) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesTitle = (r.title || r.templateName || '').toLowerCase().includes(q);
    const matchesTranscript = (r.rawTranscript || '').toLowerCase().includes(q);
    const matchesDate = r.date.toLowerCase().includes(q);
    return matchesTitle || matchesTranscript || matchesDate;
  });

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-dataColor" />
            Voice to Data & EPR Studio
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Extract electronic production records from voice dictation or enter records manually.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Templates ({templates.length})</span>
          </button>
        </div>
      </div>

      {/* Main Studio Card */}
      <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-dataColor/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <button
            onClick={() => setDataMode('flexible')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dataMode === 'flexible'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 text-textMuted hover:text-text border border-cardBorder'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>✨ Flexible (Auto-Detect Schema)</span>
          </button>

          <button
            onClick={() => setDataMode('template')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dataMode === 'template'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 text-textMuted hover:text-text border border-cardBorder'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📑 Template-Based Form</span>
          </button>
        </div>

        {/* Active Template Bar (if in Template mode) */}
        {dataMode === 'template' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-cardBorder mb-6 max-w-xl mx-auto gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-xs text-textSubtle font-semibold shrink-0">Active Template:</span>
              <span className="text-xs font-bold text-text truncate">{activeTemplate.name}</span>
              <span className="text-[10px] text-textSubtle shrink-0">
                ({activeTemplate.fields.length} fields, {activeTemplate.hasTable ? 'with table' : 'no table'})
              </span>
            </div>

            <button
              onClick={() => setShowTemplateManager(true)}
              className="text-xs text-cyan-400 hover:underline flex items-center justify-center gap-1 font-semibold transition cursor-pointer py-1 px-2.5 rounded-lg bg-slate-800/80 shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Change Template</span>
            </button>
          </div>
        )}

        {/* Dual Input Console: Voice Recording + Manual Entry */}
        <div className="flex flex-col items-center justify-center text-center py-2 sm:py-4 space-y-4">
          <AudioVisualizer isRecording={recorder.state === 'Recording'} volumeLevel={recorder.volumeLevel} />

          {/* Glowing Microphone Button */}
          <div className="relative flex items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={handleMicPress}
              disabled={isProcessing}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all shadow-2xl cursor-pointer ${
                recorder.state === 'Recording'
                  ? 'bg-danger text-white animate-pulse-mic shadow-danger/40 scale-105'
                  : 'bg-gradient-to-tr from-cyan-600 to-dataColor hover:from-dataColor hover:to-cyan-400 text-slate-950 shadow-dataColor/30 hover:scale-105 active:scale-95'
              } disabled:opacity-50`}
            >
              {recorder.state === 'Recording' ? (
                <Square className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
              ) : isProcessing ? (
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
              ) : (
                <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </button>
          </div>

          {/* Status & Timer */}
          <div>
            <div className="text-lg sm:text-xl font-mono font-bold text-text tracking-wider">
              {formatTimer(recorder.durationSeconds)}
            </div>
            <p className="text-xs font-semibold text-textMuted mt-1">
              {recorder.state === 'Recording' ? (
                <span className="text-danger flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger animate-ping" />
                  Recording voice... Tap to Stop & Extract
                </span>
              ) : isProcessing ? (
                <span className="text-cyan-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {processingStatus}
                </span>
              ) : (
                <span>Tap microphone to dictate or use manual entry</span>
              )}
            </p>
          </div>

          {/* Direct "Enter Manually" Button */}
          <div className="pt-1">
            <button
              onClick={handleOpenManualEntry}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer hover:border-cyan-500/50"
            >
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>Enter Manually Without Voice</span>
            </button>
          </div>

          {recorder.errorMessage && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recorder.errorMessage}</span>
            </div>
          )}

          {/* Helper Tips */}
          <div className="pt-2 text-[11px] sm:text-xs text-textSubtle max-w-xl leading-relaxed px-2">
            {dataMode === 'flexible' ? (
              <p>
                💡 <span className="font-semibold text-text">Voice dictation example:</span> "Part PRT-204, Date 20 August, Operator Ramesh. Hourly logs: 8 to 9 AM planned 100 actual 98 reject 2."
              </p>
            ) : (
              <p>
                💡 <span className="font-semibold text-text">Voice dictation example:</span> "For template {activeTemplate.name}: fill fields and table intervals automatically from natural speech."
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-bold text-text uppercase tracking-wider">
            Voice EPR Records ({filteredRecords.length})
          </h2>

          {/* Search & Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-textSubtle absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={filterTemplate}
              onChange={(e) => setFilterTemplate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-card border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="All">All Templates</option>
              <option value="flexible">Flexible</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Records Grid */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6">
            No Voice EPR records found. Dictate with microphone above or click "Enter Manually"!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredRecords.map((r) => (
              <div
                key={r.id}
                onClick={() =>
                  setModalMode({
                    isOpen: true,
                    existingRecord: r,
                    isManual: false,
                  })
                }
                className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder hover:border-slate-600 transition space-y-3 cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-cardBorder/60">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-text truncate">
                      {r.title || r.templateName || 'EPR Record'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/30">
                        {r.isFlexible ? 'Flexible' : r.templateName}
                      </span>
                      <span className="text-[10px] text-textSubtle">{formatDateDisplay(r.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalMode({ isOpen: true, existingRecord: r, isManual: false });
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-textSubtle hover:text-text transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteRecord(r.id, e)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-danger/20 hover:text-danger text-textSubtle transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Field summaries */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {r.isFlexible
                    ? (r.flexibleFields || []).slice(0, 4).map((f, i) => (
                        <div key={i} className="truncate">
                          <span className="text-textSubtle text-[10px] uppercase block">{f.name}</span>
                          <span className="font-medium text-text">{String(f.value || '-')}</span>
                        </div>
                      ))
                    : Object.entries(r.fieldValues || {})
                        .slice(0, 4)
                        .map(([k, v], i) => (
                          <div key={i} className="truncate">
                            <span className="text-textSubtle text-[10px] uppercase block">{k}</span>
                            <span className="font-medium text-text">{String(v || '-')}</span>
                          </div>
                        ))}
                </div>

                {/* Table rows badge */}
                <div className="pt-2 border-t border-cardBorder flex items-center justify-between text-[11px] text-textSubtle">
                  <span>
                    {r.tableRows?.length ? `${r.tableRows.length} repeated table rows` : 'No table rows'}
                  </span>
                  <span className="text-cyan-400 font-semibold group-hover:underline">
                    View / Print →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Manual Entry Modal */}
      {modalMode.isOpen && (
        <DataEntryEditModal
          isManual={modalMode.isManual}
          extractedData={modalMode.extractedData}
          flexibleData={modalMode.flexibleData}
          existingRecord={modalMode.existingRecord}
          template={
            modalMode.existingRecord
              ? templates.find((t) => t.id === modalMode.existingRecord?.templateId) || activeTemplate
              : activeTemplate
          }
          onClose={() => setModalMode({ isOpen: false })}
          onSaved={() => {
            setModalMode({ isOpen: false });
            fetchTemplatesAndRecords();
          }}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManagerModal
          activeTemplateId={activeTemplate.id}
          onSelectActive={(tmpl) => {
            setActiveTemplate(tmpl);
            setShowTemplateManager(false);
          }}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
}
