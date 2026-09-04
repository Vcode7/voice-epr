'use client';

import React, { useRef, useState } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Sparkles,
  Layers,
  Settings2,
  Edit3,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Volume2,
  Upload,
} from 'lucide-react';
import { DataTemplate, RecordingState } from '@/types';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';

interface PrescriptionRecordingPanelProps {
  activeTemplate: DataTemplate;
  onEditTemplate: () => void;
  // Recording state
  recordingState: RecordingState;
  durationSeconds: number;
  volumeLevel: number;
  isProcessing: boolean;
  processingStatus: string;
  errorMessage: string | null;
  lastTranscript: string | null;
  // Actions
  onMicPress: () => void;
  onUploadAudio?: (file: File) => void;
  onExtractText: (text: string) => void;
}

export function PrescriptionRecordingPanel({
  activeTemplate,
  onEditTemplate,
  recordingState,
  durationSeconds,
  volumeLevel,
  isProcessing,
  processingStatus,
  errorMessage,
  lastTranscript,
  onMicPress,
  onUploadAudio,
  onExtractText,
}: PrescriptionRecordingPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyTranscript = () => {
    if (!lastTranscript) return;
    navigator.clipboard.writeText(lastTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAudio) {
      onUploadAudio(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onUploadAudio) {
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|webm|ogg|aac|flac|mp4)$/i)) {
        onUploadAudio(file);
      } else {
        alert('Please upload a valid audio file (.mp3, .wav, .m4a, .webm, etc.).');
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onExtractText(textInput.trim());
  };

  const isRecording = recordingState === 'Recording';

  return (
    <div className="bg-card border border-cardBorder rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5 h-full">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Active Template Info Banner & Edit Template Option */}
      <div className="p-3.5 rounded-xl bg-surface/80 border border-cardBorder flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-textSubtle tracking-wider block">
            Active Prescription Template
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold text-text truncate">{activeTemplate.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
              {activeTemplate.fields.length} fields
            </span>
            {activeTemplate.hasTable && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                + Medicine Table
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onEditTemplate}
          className="px-3 py-1.5 rounded-xl bg-card hover:bg-surfaceMuted border border-cardBorder text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
          title="Customize template fields & table columns"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Template</span>
        </button>
      </div>

      {/* 2. Input Mode Toggle (Voice vs Clinical Text) */}
      <div className="flex items-center justify-between bg-surface p-1 rounded-xl border border-cardBorder text-xs">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
              : 'text-textMuted hover:text-text'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Recording</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'text'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
              : 'text-textMuted hover:text-text'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Clinical Notes / Text</span>
        </button>
      </div>

      {/* 3. Main Voice Recording Center */}
      {activeTab === 'voice' ? (
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 space-y-4">
          {/* Big Circular Microphone Button */}
          <div className="relative">
            <button
              onClick={onMicPress}
              disabled={isProcessing}
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all transform active:scale-95 cursor-pointer relative z-10 ${
                isRecording
                  ? 'bg-danger text-white shadow-danger/50 animate-pulse-mic'
                  : isProcessing
                  ? 'bg-surface border-2 border-teal-500/50 text-textMuted'
                  : 'bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 hover:from-teal-600 hover:to-emerald-400 text-white shadow-teal-500/30 hover:scale-105'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-9 h-9 fill-current" />
                  <span className="text-[11px] font-mono font-bold mt-1 tracking-wider">
                    {formatTimer(durationSeconds)}
                  </span>
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
                  <span className="text-[10px] font-bold mt-1 text-teal-300">Processing</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10" />
                  <span className="text-[11px] font-bold mt-1 tracking-wide">Dictate</span>
                </>
              )}
            </button>
          </div>

          {/* Status Text & Visualizer */}
          <div className="text-center space-y-1 w-full max-w-xs">
            <div className="text-xs sm:text-sm font-bold text-text">
              {isRecording
                ? 'Listening to Doctor Consultation...'
                : isProcessing
                ? processingStatus || 'Extracting structured prescription...'
                : 'Click to Start Doctor Voice Dictation'}
            </div>
            <p className="text-[11px] text-textMuted">
              {isRecording
                ? 'Speak patient details, diagnosis, medicines, dosage & timing'
                : 'Supports continuous dictation & multi-medicine prescriptions'}
            </p>

            {/* Audio Visualizer */}
            {isRecording && (
              <div className="pt-2">
                <AudioVisualizer isRecording={isRecording} volumeLevel={volumeLevel} />
              </div>
            )}
          </div>

          {/* Audio File Dropzone / Upload */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full p-3.5 rounded-xl border-2 border-dashed text-center transition cursor-pointer ${
              isDragging
                ? 'border-teal-400 bg-teal-500/15 scale-[1.01]'
                : 'border-cardBorder hover:border-teal-500/50 bg-surface/40 hover:bg-surface/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            <div className="flex items-center justify-center space-x-2 text-xs text-textMuted">
              <Upload className="w-4 h-4 text-teal-400" />
              <span>
                Drop audio recording here or <strong className="text-teal-400">browse file</strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Text Prompt Extraction Mode */
        <form onSubmit={handleTextSubmit} className="space-y-3 py-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type or paste medical consultation text here (e.g. 'Patient John Doe age 34 phone 9876543210. Prescribe Augmentin 625 1 tablet twice daily after food for 5 days and Dolo 650 thrice daily after food for 3 days.')..."
            rows={5}
            className="w-full p-3 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 leading-relaxed resize-none font-sans"
          />
          <button
            type="submit"
            disabled={isProcessing || !textInput.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/25 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Medical Extraction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Prescription Fields</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* 4. Processing Status Indicator */}
      {isProcessing && (
        <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-teal-500 shrink-0" />
          <span>{processingStatus || 'Extracting prescription entities with Medical AI...'}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 5. Last Transcript Box */}
      {lastTranscript && (
        <div className="p-3.5 rounded-xl bg-surface/60 border border-cardBorder space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-textSubtle tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-teal-400" />
              <span>Transcribed Speech</span>
            </span>
            <button
              onClick={handleCopyTranscript}
              className="text-[10px] text-teal-400 hover:text-text font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-text leading-relaxed line-clamp-4 font-mono select-text">
            &ldquo;{lastTranscript}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
