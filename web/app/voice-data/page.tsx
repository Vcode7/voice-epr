'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  Layers,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Database,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Undo2,
  X,
} from 'lucide-react';
import { useWebAudioRecorder } from '@/hooks/useWebAudioRecorder';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDisplayKeyCombo } from '@/lib/utils/shortcutManager';
import {
  DataTemplate,
  DataEntryRecord,
  ExtractedDataResult,
  FlexibleExtractedResult,
  SessionDataEntry,
  UserSettings,
} from '@/types';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE, DEFAULT_SETTINGS } from '@/lib/constants';
import { VoiceAudioPlayer } from '@/components/voice/VoiceAudioPlayer';
import { formatDateDisplay, getTodayString, normalizeDateToDDMMYYYY, isDateField } from '@/lib/utils/dateUtils';
import { applyAutoFill } from '@/lib/utils/autoFillHelper';
import { exportEntriesToExcel } from '@/lib/utils/excelExporter';
import { VoiceRecordingPanel } from '@/components/voice/VoiceRecordingPanel';
import { ExtractedEntriesList } from '@/components/voice/ExtractedEntriesList';
import { PrintableEntriesReport } from '@/components/voice/PrintableEntriesReport';
import { BatchDataEntryViewModal } from '@/components/modals/BatchDataEntryViewModal';
import { TemplateManagerModal } from '@/components/modals/TemplateManagerModal';

export default function VoiceDataPage() {
  // 1. Default mode is 'template' (Template-Based Form)
  const [dataMode, setDataMode] = useState<'template' | 'flexible'>('template');
  const [templates, setTemplates] = useState<DataTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<DataTemplate>(DEFAULT_MONITORING_DETAILS_TEMPLATE);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // 2. Accumulated Session Entries (Left Panel) & Undo Stack
  const [entries, setEntries] = useState<SessionDataEntry[]>([]);
  const [undoStack, setUndoStack] = useState<SessionDataEntry[][]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 3. Voice recording & extraction state (Right Panel)
  const recorder = useWebAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastExtractedEntryNumber, setLastExtractedEntryNumber] = useState<number | null>(null);

  // 3b. Voice Editing on Specific Existing Entry
  const [activeVoiceEditingId, setActiveVoiceEditingId] = useState<string | null>(null);
  const [isVoiceEditingProcessing, setIsVoiceEditingProcessing] = useState(false);
  const [voiceEditingStatus, setVoiceEditingStatus] = useState<string>('');
  const [lastEditedNotification, setLastEditedNotification] = useState<{
    entryId: string;
    message: string;
  } | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // 4. Saved Database Records (History section below)
  const [records, setRecords] = useState<DataEntryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('All');
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [showSavedHistory, setShowSavedHistory] = useState(false);

  // Modal for editing past saved records
  const [modalMode, setModalMode] = useState<{
    isOpen: boolean;
    existingRecord?: DataEntryRecord;
  }>({ isOpen: false });

  // Fetch initial data
  const fetchTemplatesAndRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const [tmplRes, recRes, setRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/data-entries'),
        fetch('/api/settings'),
      ]);
      const tmplData = await tmplRes.json();
      const recData = await recRes.json();
      const setData = await setRes.json();

      if (Array.isArray(tmplData) && tmplData.length > 0) {
        setTemplates(tmplData);
        const def = tmplData.find((t: DataTemplate) => t.isDefault) || tmplData[0];
        setActiveTemplate((prev) => (prev.id === DEFAULT_MONITORING_DETAILS_TEMPLATE.id ? def : prev));
      }
      if (Array.isArray(recData)) setRecords(recData);
      if (setData && !setData.error) setSettings(setData);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplatesAndRecords();
  }, [fetchTemplatesAndRecords]);

  // Keep recorder's audio URL in state
  useEffect(() => {
    if (recorder.audioUrl) {
      setLastAudioUrl(recorder.audioUrl);
    }
  }, [recorder.audioUrl]);

  // Helper to update entries and preserve undo history
  const updateEntriesWithHistory = (
    updater: (prev: SessionDataEntry[]) => SessionDataEntry[]
  ) => {
    setEntries((prev) => {
      setUndoStack((stack) => [...stack.slice(-19), prev]);
      return updater(prev);
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setEntries(previous);
    setSaveSuccessMsg('↺ Undid latest change to entries.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Voice Edit Handler for editing a specific entry via voice
  const handleVoiceEditEntry = async (entryId: string) => {
    if (activeVoiceEditingId === entryId) {
      if (recorder.state === 'Recording') {
        const blob = await recorder.stopRecording();
        if (!blob) {
          setActiveVoiceEditingId(null);
          return;
        }

        try {
          setIsVoiceEditingProcessing(true);
          setVoiceEditingStatus('Transcribing voice correction...');

          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');

          const transcribeRes = await fetch('/api/groq/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!transcribeRes.ok) {
            throw new Error('Failed to transcribe voice correction.');
          }

          const { text } = await transcribeRes.json();
          setVoiceEditingStatus(`Extracting field update for "${text}"...`);

          const targetEntry = entries.find((e) => e.id === entryId);
          if (!targetEntry) throw new Error('Target entry not found.');

          const tmpl = templates.find((t) => t.id === targetEntry.templateId) || activeTemplate;

          const editRes = await fetch('/api/groq/voice-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: text,
              template: targetEntry.mode === 'template' ? tmpl : null,
              currentValues: targetEntry.fieldValues || {},
              isFlexible: targetEntry.mode === 'flexible',
              flexibleFields: targetEntry.flexibleFields,
            }),
          });

          if (!editRes.ok) {
            throw new Error('Failed to process voice field update.');
          }

          const editData = await editRes.json();

          // Update entry in state with history
          updateEntriesWithHistory((prev) =>
            prev.map((e) => {
              if (e.id !== entryId) return e;
              return {
                ...e,
                fieldValues: editData.finalFieldValues || editData.updatedFields || e.fieldValues,
                lookupStatus: editData.lookupStatus ?? e.lookupStatus,
                invalidLookup: editData.invalidLookup ?? e.invalidLookup,
                invalidLookupMessage: editData.invalidLookupMessage ?? e.invalidLookupMessage,
              };
            })
          );

          setLastEditedNotification({
            entryId,
            message: editData.summary || `✓ Updated fields from voice: "${text}"`,
          });

          setTimeout(() => setLastEditedNotification(null), 5000);
        } catch (err: any) {
          alert(`Voice edit error: ${err.message || 'Unknown error'}`);
        } finally {
          setIsVoiceEditingProcessing(false);
          setActiveVoiceEditingId(null);
          setVoiceEditingStatus('');
          recorder.setState('Ready');
        }
      } else {
        setActiveVoiceEditingId(null);
      }
    } else {
      // If currently regular recording, stop it
      if (recorder.state === 'Recording') {
        await recorder.stopRecording();
      }
      setActiveVoiceEditingId(entryId);
      await recorder.startRecording();
    }
  };

  // Unified Audio Processing Function (supports mic recordings and uploaded audio files)
  const processAudioInput = async (blob: Blob | File, filename: string = 'recording.webm') => {
    try {
      setIsProcessing(true);
      recorder.setState('Transcribing');
      setProcessingStatus('Transcribing audio with Whisper AI...');

      const formData = new FormData();
      formData.append('file', blob, filename);

      const transcribeRes = await fetch('/api/groq/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Audio transcription failed.');
      }

      const { text } = await transcribeRes.json();
      setLastTranscript(text);
      recorder.setState('Understanding');
      setProcessingStatus('Extracting structured entities into new Entry...');

      const currentEntryNum = entries.length + 1;
      const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const recordedAudioUrl = blob instanceof Blob ? URL.createObjectURL(blob) : recorder.audioUrl;
      setLastAudioUrl(recordedAudioUrl);

      if (dataMode === 'flexible') {
        const res = await fetch('/api/groq/flexible', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
        });
        const data: FlexibleExtractedResult = await res.json();

        const newEntry: SessionDataEntry = {
          id: entryId,
          entryNumber: currentEntryNum,
          mode: 'flexible',
          templateId: 'flexible',
          templateName: data.title || 'Flexible Voice Record',
          title: data.title || 'Flexible Voice Record',
          fieldValues: (data.fields || []).reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
          flexibleFields: data.fields || [],
          tableTitle: data.table?.title || 'Detected Data Table',
          tableHeaders: data.table?.headers || ['Time Interval', 'Produced Qty', 'Status'],
          tableRows: data.table?.rows || [],
          rawTranscript: text,
          audioUrl: recordedAudioUrl,
          createdAt: new Date().toISOString(),
        };

        updateEntriesWithHistory((prev) => [...prev, newEntry]);
      } else {
        const res = await fetch('/api/groq/custom-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text, template: activeTemplate }),
        });
        const data: ExtractedDataResult = await res.json();

        const newEntry: SessionDataEntry = {
          id: entryId,
          entryNumber: currentEntryNum,
          mode: 'template',
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          title: activeTemplate.name,
          fieldValues: data.fieldValues || {},
          tableTitle: activeTemplate.tableTitle || 'Repeated Entries',
          tableHeaders: activeTemplate.tableFields?.map((f) => f.name) || [],
          tableRows: data.tableRows || [],
          rawTranscript: text,
          audioUrl: recordedAudioUrl,
          createdAt: new Date().toISOString(),
          lookupStatus: data.lookupStatus,
          invalidLookup: data.invalidLookup,
          invalidLookupMessage: data.invalidLookupMessage,
        };

        updateEntriesWithHistory((prev) => [...prev, newEntry]);
      }

      setLastExtractedEntryNumber(currentEntryNum);
      recorder.setState('Ready');
    } catch (err: any) {
      console.error('Audio Processing Error:', err);
      recorder.setErrorMessage(err.message || 'Processing failed. Please try again.');
      recorder.setState('Error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle microphone toggle
  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const blob = await recorder.stopRecording();
      if (!blob) return;
      await processAudioInput(blob, 'recording.webm');
    } else {
      await recorder.startRecording();
    }
  };

  // Handle uploaded audio file
  const handleUploadAudio = async (file: File) => {
    if (!file) return;
    if (recorder.state === 'Recording') {
      await recorder.stopRecording();
    }
    await processAudioInput(file, file.name);
  };

  // Direct manual entry addition
  const handleAddManualEntry = () => {
    const currentEntryNum = entries.length + 1;
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (dataMode === 'flexible') {
      const newEntry: SessionDataEntry = {
        id: entryId,
        entryNumber: currentEntryNum,
        mode: 'flexible',
        templateId: 'flexible',
        templateName: 'Manual Flexible Record',
        title: 'Manual Flexible Record',
        fieldValues: { 'Item Name': '', 'Batch / Code': '' },
        flexibleFields: [
          { id: '1', name: 'Item Name', value: '' },
          { id: '2', name: 'Batch / Code', value: '' },
        ],
        tableTitle: 'Data Table',
        tableHeaders: ['Time Interval', 'Produced Qty', 'Status'],
        tableRows: [['', '', '']],
        rawTranscript: '[Manual Entry]',
        audioUrl: null,
        createdAt: new Date().toISOString(),
      };
      updateEntriesWithHistory((prev) => [...prev, newEntry]);
    } else {
      const defaultFieldValues: Record<string, any> = {};
      activeTemplate.fields.forEach((f) => {
        if (f.type === 'boolean') {
          defaultFieldValues[f.extractionKey] = false;
        } else if (f.type === 'date' || isDateField(f.extractionKey) || isDateField(f.name)) {
          defaultFieldValues[f.extractionKey] = getTodayString();
        } else {
          defaultFieldValues[f.extractionKey] = f.defaultValue || '';
        }
      });

      let initialTableRows: Array<Record<string, any>> = [];
      if (activeTemplate.hasTable && activeTemplate.tableFields?.length > 0) {
        const emptyRow: Record<string, any> = {};
        activeTemplate.tableFields.forEach((c) => {
          emptyRow[c.extractionKey] = c.type === 'boolean' ? false : '';
        });
        initialTableRows = [emptyRow];
      }

      const newEntry: SessionDataEntry = {
        id: entryId,
        entryNumber: currentEntryNum,
        mode: 'template',
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
        title: activeTemplate.name,
        fieldValues: defaultFieldValues,
        tableTitle: activeTemplate.tableTitle || 'Repeated Entries',
        tableHeaders: activeTemplate.tableFields?.map((f) => f.name) || [],
        tableRows: initialTableRows,
        rawTranscript: '[Manual Entry]',
        audioUrl: null,
        createdAt: new Date().toISOString(),
      };
      updateEntriesWithHistory((prev) => [...prev, newEntry]);
    }
  };

  // Entry updates (inline editing with Auto-Fill support & date normalization)
  const handleUpdateEntryField = (entryId: string, fieldKey: string, value: any) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const currentTmpl = templates.find((t) => t.id === e.templateId) || activeTemplate;
        const targetField = currentTmpl.fields.find((f) => f.extractionKey === fieldKey);

        let finalValue = value;
        if (targetField && (targetField.type === 'date' || isDateField(fieldKey) || isDateField(targetField.name))) {
          // If editing date, normalize if non-empty
          if (typeof value === 'string' && value.length >= 8) {
            finalValue = normalizeDateToDDMMYYYY(value);
          }
        }

        let updatedValues = {
          ...e.fieldValues,
          [fieldKey]: finalValue,
        };

        let lookupStatus = e.lookupStatus;
        let invalidLookup = e.invalidLookup;
        let invalidLookupMessage = e.invalidLookupMessage;

        if (currentTmpl?.autoFill?.enabled && fieldKey === currentTmpl.autoFill.baseFieldKey) {
          const autoFillRes = applyAutoFill(updatedValues, currentTmpl);
          updatedValues = autoFillRes.updatedValues;
          lookupStatus = autoFillRes.lookupStatus;
          invalidLookup = autoFillRes.invalidLookup;
          invalidLookupMessage = autoFillRes.invalidLookupMessage;
        }

        return {
          ...e,
          fieldValues: updatedValues,
          lookupStatus,
          invalidLookup,
          invalidLookupMessage,
        };
      })
    );
  };

  const handleUpdateFlexibleField = (entryId: string, fieldIdx: number, key: 'name' | 'value', value: any) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const flex = [...(e.flexibleFields || [])];
        if (flex[fieldIdx]) {
          flex[fieldIdx] = { ...flex[fieldIdx], [key]: value };
        }
        return {
          ...e,
          flexibleFields: flex,
          fieldValues: flex.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
        };
      })
    );
  };

  const handleAddFlexibleField = (entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const flex = [...(e.flexibleFields || [])];
        flex.push({ id: `f_${Date.now()}`, name: `Field ${flex.length + 1}`, value: '' });
        return { ...e, flexibleFields: flex };
      })
    );
  };

  const handleDeleteFlexibleField = (entryId: string, fieldIdx: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const flex = (e.flexibleFields || []).filter((_, i) => i !== fieldIdx);
        return {
          ...e,
          flexibleFields: flex,
          fieldValues: flex.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
        };
      })
    );
  };

  const handleUpdateTableRow = (entryId: string, rowIdx: number, colKey: string | number, value: any) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const rows = [...(e.tableRows || [])];
        if (Array.isArray(rows[rowIdx])) {
          const rowArr = [...(rows[rowIdx] as any[])];
          rowArr[Number(colKey)] = value;
          rows[rowIdx] = rowArr;
        } else if (typeof rows[rowIdx] === 'object' && rows[rowIdx] !== null) {
          rows[rowIdx] = { ...(rows[rowIdx] as Record<string, any>), [colKey]: value };
        }
        return { ...e, tableRows: rows };
      })
    );
  };

  const handleAddTableRow = (entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const template = templates.find((t) => t.id === e.templateId) || activeTemplate;
        const rows = [...(e.tableRows || [])];
        if (e.mode === 'template' && template?.tableFields) {
          const emptyRow: Record<string, any> = {};
          template.tableFields.forEach((c) => {
            emptyRow[c.extractionKey] = c.type === 'boolean' ? false : '';
          });
          rows.push(emptyRow);
        } else {
          rows.push(['', '', '']);
        }
        return { ...e, tableRows: rows };
      })
    );
  };

  const handleDeleteTableRow = (entryId: string, rowIdx: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const rows = (e.tableRows || []).filter((_, i) => i !== rowIdx);
        return { ...e, tableRows: rows };
      })
    );
  };

  const handleDeleteEntry = (entryId: string) => {
    updateEntriesWithHistory((prev) => {
      const remaining = prev.filter((e) => e.id !== entryId);
      // re-number entries
      return remaining.map((e, idx) => ({ ...e, entryNumber: idx + 1 }));
    });
  };

  // Actions on Left Panel: Save all entries as ONE parent record containing multiple child entries
  const handleSaveAll = async () => {
    if (entries.length === 0) return;
    try {
      setIsSavingAll(true);
      setSaveSuccessMsg(null);
      const count = entries.length;
      const parentTitle = `${activeTemplate.name} (${count} ${count === 1 ? 'Entry' : 'Entries'})`;

      // Determine primary date in DD-MM-YYYY format
      let primaryDate = getTodayString();
      if (entries[0]?.fieldValues) {
        const dateKey = Object.keys(entries[0].fieldValues).find((k) => isDateField(k));
        if (dateKey && entries[0].fieldValues[dateKey]) {
          primaryDate = normalizeDateToDDMMYYYY(entries[0].fieldValues[dateKey]);
        }
      }

      const payload: Partial<DataEntryRecord> = {
        templateId: dataMode === 'flexible' ? 'flexible' : activeTemplate.id,
        templateName: activeTemplate.name,
        isFlexible: dataMode === 'flexible',
        title: parentTitle,
        entries: entries, // All child entries inside this parent record
        totalEntries: count,
        fieldValues: entries[0]?.fieldValues || {},
        flexibleFields: entries[0]?.flexibleFields,
        tableTitle: entries[0]?.tableTitle,
        tableHeaders: entries[0]?.tableHeaders,
        tableRows: entries[0]?.tableRows || [],
        rawTranscript: entries.map((e) => `[Entry #${e.entryNumber}]: ${e.rawTranscript || ''}`).join('\n\n'),
        date: primaryDate,
      };

      await fetch('/api/data-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setEntries([]); // Clear entries for new session
      setSaveSuccessMsg(`✓ Successfully saved parent record with ${count} child ${count === 1 ? 'entry' : 'entries'} to database! Prepared for new session.`);
      fetchTemplatesAndRecords();
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handlePrint = () => {
    if (entries.length === 0) {
      alert('No entries to print.');
      return;
    }
    window.print();
  };

  const handleExportExcel = () => {
    exportEntriesToExcel(entries, 'Voice_EPR_Session_Report');
  };

  const handleClearAll = () => {
    if (entries.length === 0) return;
    if (confirm(`Are you sure you want to clear all ${entries.length} current entries?`)) {
      updateEntriesWithHistory(() => []);
      setLastTranscript(null);
      setLastAudioUrl(null);
      setLastExtractedEntryNumber(null);
      setActiveVoiceEditingId(null);
    }
  };

  // 5. Connect Keyboard Shortcuts Engine
  const { shortcuts, getShortcutDisplay } = useKeyboardShortcuts(
    {
      onToggleRecording: handleMicPress,
      onNewTemplate: () => setShowTemplateManager(true),
      onAddField: handleAddManualEntry,
      onSaveAll: handleSaveAll,
      onEditEntry: () => {
        if (entries.length > 0) {
          const targetId = activeVoiceEditingId || entries[entries.length - 1].id;
          handleVoiceEditEntry(targetId);
        }
      },
      onCancelAction: () => {
        if (activeVoiceEditingId) {
          if (recorder.state === 'Recording') recorder.stopRecording();
          setActiveVoiceEditingId(null);
        } else if (recorder.state === 'Recording') {
          recorder.stopRecording();
        }
        setShowTemplateManager(false);
        setShowShortcutsModal(false);
        setModalMode({ isOpen: false });
      },
      onUndo: handleUndo,
      onPrintReport: handlePrint,
      onExportExcel: handleExportExcel,
      onClearAll: handleClearAll,
    },
    { enabled: true, userSettingsConfig: settings.keyboardShortcuts }
  );

  // Delete past saved record
  const handleDeleteSavedRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved EPR record from database?')) return;
    await fetch(`/api/data-entries/${id}`, { method: 'DELETE' });
    fetchTemplatesAndRecords();
  };

  // Filter saved records
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Printable Report (hidden on screen, visible only when printing) */}
      <PrintableEntriesReport entries={entries} settings={settings} />

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            Voice to Data &amp; EPR Studio
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Two-panel voice dictation: dictations create individual entries on the left. Review, edit, and Save/Print/Export in batch.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              title={`Undo latest action (${getShortcutDisplay('undo') || 'Ctrl + Z'})`}
            >
              <Undo2 className="w-3.5 h-3.5 text-secondary" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="View active keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-dataColor" />
            <span>Templates ({templates.length})</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-success/20 border border-success/40 text-success text-xs font-bold flex items-center justify-between shadow-lg no-print animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-textMuted hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TWO-PANEL STUDIO LAYOUT (Left Panel: Entries | Right Panel: Recording) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        {/* LEFT PANEL (Extracted Data Entries Stack & Actions) */}
        <div className="lg:col-span-7 h-full">
          <ExtractedEntriesList
            entries={entries}
            templates={templates}
            activeTemplate={activeTemplate}
            isSaving={isSavingAll}
            isRecording={recorder.state === 'Recording'}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            dataMode={dataMode}
            onSaveAll={handleSaveAll}
            onPrint={handlePrint}
            onExportExcel={handleExportExcel}
            onClearAll={handleClearAll}
            onAddManualEntry={handleAddManualEntry}
            onDeleteEntry={handleDeleteEntry}
            onUpdateEntryField={handleUpdateEntryField}
            onUpdateFlexibleField={handleUpdateFlexibleField}
            onAddFlexibleField={handleAddFlexibleField}
            onDeleteFlexibleField={handleDeleteFlexibleField}
            onUpdateTableRow={handleUpdateTableRow}
            onAddTableRow={handleAddTableRow}
            onDeleteTableRow={handleDeleteTableRow}
            onVoiceEditEntry={handleVoiceEditEntry}
            activeVoiceEditingId={activeVoiceEditingId}
            isVoiceEditingProcessing={isVoiceEditingProcessing}
            voiceEditingStatus={voiceEditingStatus}
            lastEditedNotification={lastEditedNotification}
          />
        </div>

        {/* RIGHT PANEL (Recording Console, Audio Player & Transcription) */}
        <div className="lg:col-span-5 h-full">
          <VoiceRecordingPanel
            dataMode={dataMode}
            onModeChange={setDataMode}
            activeTemplate={activeTemplate}
            onChangeTemplate={() => setShowTemplateManager(true)}
            templatesCount={templates.length}
            recordingState={recorder.state}
            durationSeconds={recorder.durationSeconds}
            volumeLevel={recorder.volumeLevel}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            errorMessage={recorder.errorMessage}
            lastAudioUrl={lastAudioUrl}
            lastTranscript={lastTranscript}
            lastExtractedEntryNumber={lastExtractedEntryNumber}
            onMicPress={handleMicPress}
            onOpenManualEntry={handleAddManualEntry}
            onUploadAudio={handleUploadAudio}
          />
        </div>
      </div>

      {/* SAVED DATABASE RECORDS ACCORDION / HISTORY */}
      <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl no-print">
        <div
          onClick={() => setShowSavedHistory((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-text">
              Saved EPR Database Records ({filteredRecords.length})
            </h2>
            <span className="text-xs text-textSubtle hidden sm:inline">
              (Past records stored in MongoDB)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-semibold">
              {showSavedHistory ? 'Hide History' : 'Show History'}
            </span>
            {showSavedHistory ? (
              <ChevronUp className="w-4 h-4 text-textSubtle" />
            ) : (
              <ChevronDown className="w-4 h-4 text-textSubtle" />
            )}
          </div>
        </div>

        {showSavedHistory && (
          <div className="mt-4 pt-4 border-t border-cardBorder space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-textSubtle absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search saved records..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500 font-medium"
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

            {/* Records Grid */}
            {filteredRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-textMuted bg-background/50 rounded-xl border border-cardBorder p-4">
                No saved records found. Dictate or enter records above and click "Save"!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setModalMode({ isOpen: true, existingRecord: r })}
                    className="p-4 rounded-xl bg-card border border-cardBorder hover:border-dataColor/50 transition-all space-y-3 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-cardBorder/60">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-text truncate">
                            {r.title || r.templateName || 'EPR Record'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface text-dataColor border border-dataColor/30">
                            {r.isFlexible ? 'Flexible' : r.templateName}
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                            {r.totalEntries || r.entries?.length || 1} {(r.totalEntries || r.entries?.length || 1) === 1 ? 'Entry' : 'Entries'}
                          </span>
                          <span className="text-[10px] text-textSubtle">{formatDateDisplay(r.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalMode({ isOpen: true, existingRecord: r });
                          }}
                          className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-dataColor hover:text-text transition cursor-pointer"
                          title="View Parent Record & Child Entries"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSavedRecord(r.id, e)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                          title="Delete Record"
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

                    <div className="pt-2 border-t border-cardBorder/60 flex items-center justify-between text-[11px] text-textSubtle">
                      <span>
                        {r.entries?.length ? `${r.entries.length} child entries contained` : r.tableRows?.length ? `${r.tableRows.length} table rows` : '1 entry'}
                      </span>
                      <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-1">
                        <span>Open &amp; Print / Excel</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Parent Record & Child Entries Modal */}
      {modalMode.isOpen && modalMode.existingRecord && (
        <BatchDataEntryViewModal
          record={modalMode.existingRecord}
          settings={settings}
          onClose={() => setModalMode({ isOpen: false })}
          onDeleted={() => {
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

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cardBorder">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-text">Voice to Data Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1.5 rounded-lg text-textMuted hover:text-text hover:bg-surfaceMuted transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
              <p className="text-xs text-textMuted">
                Shortcuts are active on the Voice to Data page. Single-key shortcuts (like R) are automatically disabled while typing in text inputs.
              </p>

              <div className="divide-y divide-cardBorder/60 border border-cardBorder rounded-xl bg-surface/50 overflow-hidden">
                {shortcuts.map((action) => (
                  <div key={action.id} className="p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-text">{action.name}</p>
                      <p className="text-[11px] text-textSubtle">{action.description}</p>
                    </div>
                    <kbd className="px-2.5 py-1 rounded-lg bg-background border border-cardBorder font-mono font-bold text-xs text-primary shrink-0 shadow-sm">
                      {formatDisplayKeyCombo(action.key) || 'Unassigned'}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-cardBorder bg-surface/30 flex items-center justify-between">
              <a
                href="/settings#shortcuts"
                className="text-xs text-primary hover:underline font-semibold"
              >
                Customize in Settings →
              </a>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
