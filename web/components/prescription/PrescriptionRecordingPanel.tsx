'use client';

import React, { useRef, useState } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Upload,
} from 'lucide-react';
import { RecordingState } from '@/types';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';

interface PrescriptionRecordingPanelProps {
  recordingState: RecordingState;
  durationSeconds: number;
  volumeLevel: number;
  isProcessing: boolean;
  processingStatus: string;
  errorMessage: string | null;
  lastTranscript: string | null;
  onMicPress: () => void;
  onUploadAudio: (file: File) => void;
  onExtractText: (text: string) => void;
}

const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|webm|ogg|aac|flac|mp4)$/i;

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function PrescriptionRecordingPanel({
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
  const [dropError, setDropError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRecording = recordingState === 'Recording';

  const handleCopyTranscript = async () => {
    if (!lastTranscript) return;
    try {
      await navigator.clipboard.writeText(lastTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; transcript stays selectable.
    }
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type.startsWith('audio/') || AUDIO_FILE_PATTERN.test(file.name)) {
      setDropError(null);
      onUploadAudio(file);
    } else {
      setDropError('Please choose an audio file (.mp3, .wav, .m4a, .webm, .ogg ...).');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onExtractText(textInput.trim());
  };

  return (
    <div className="bg-card border border-cardBorder rounded-2xl shadow-xl relative overflow-hidden flex flex-col">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Mode switch */}
      <div className="p-4 sm:p-5 pb-0 relative">
        <div
          role="tablist"
          className="grid grid-cols-2 bg-surface p-1 rounded-xl border border-cardBorder text-xs"
        >
          {(
            [
              { id: 'voice', label: 'Dictate', icon: Mic },
              { id: 'text', label: 'Type / Paste', icon: FileText },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === id
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                  : 'text-textMuted hover:text-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4 relative">
        {mode === 'voice' ? (
          <>
            <div className="flex flex-col items-center py-2 gap-4">
              <div className="relative">
                {isRecording && (
                  <span className="absolute inset-0 rounded-full bg-danger/30 animate-ping" />
                )}
                <button
                  onClick={onMicPress}
                  disabled={isProcessing}
                  aria-label={isRecording ? 'Stop recording' : 'Start dictation'}
                  className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 relative z-10 ${
                    isRecording
                      ? 'bg-danger text-white shadow-danger/50 cursor-pointer'
                      : isProcessing
                      ? 'bg-surface border-2 border-teal-500/50 text-textMuted cursor-wait'
                      : 'bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 hover:from-teal-600 hover:to-emerald-400 text-white shadow-teal-500/30 hover:scale-105 cursor-pointer'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-8 h-8 fill-current" />
                      <span className="text-xs font-mono font-bold mt-1 tracking-wider">
                        {formatTimer(durationSeconds)}
                      </span>
                    </>
                  ) : isProcessing ? (
                    <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
                  ) : (
                    <>
                      <Mic className="w-9 h-9" />
                      <span className="text-[11px] font-bold mt-1 tracking-wide">Tap to speak</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center space-y-1 w-full">
                <div className="text-sm font-bold text-text">
                  {isRecording
                    ? 'Listening… tap again to finish'
                    : isProcessing
                    ? processingStatus || 'Working on it…'
                    : 'Dictate the consultation'}
                </div>
                <p className="text-[11px] text-textMuted leading-relaxed">
                  {isRecording
                    ? 'Patient details, diagnosis, then each medicine with dose, frequency and days.'
                    : 'You can dictate more than once — new medicines are added to the list.'}
                </p>
                {isRecording && <AudioVisualizer isRecording={isRecording} volumeLevel={volumeLevel} />}
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`p-3 rounded-xl border-2 border-dashed text-center transition ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isDragging
                  ? 'border-teal-400 bg-teal-500/15'
                  : 'border-cardBorder hover:border-teal-500/50 bg-surface/40'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  acceptFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                accept="audio/*"
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs text-textMuted">
                <Upload className="w-4 h-4 text-teal-400" />
                <span>
                  Or drop an audio file / <strong className="text-teal-400">browse</strong>
                </span>
              </div>
            </div>
            {dropError && <p className="text-[11px] text-danger -mt-2">{dropError}</p>}
          </>
        ) : (
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Patient Ananya Sharma, 29 female, phone 9845012345. Diagnosis viral pharyngitis. Augmentin 625 twice daily after food for 5 days, Dolo 650 thrice daily for 3 days."
              rows={7}
              className="w-full p-3 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
            />
            <button
              type="submit"
              disabled={isProcessing || !textInput.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-600/25 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Extracting…'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Fill prescription from text</span>
                </>
              )}
            </button>
          </form>
        )}

        {isProcessing && mode === 'voice' && (
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{processingStatus || 'Working on it…'}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>{errorMessage}</span>
          </div>
        )}

        {lastTranscript && (
          <div className="p-3.5 rounded-xl bg-surface/60 border border-cardBorder space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-textSubtle tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-teal-400" />
                Last transcript
              </span>
              <button
                onClick={handleCopyTranscript}
                className="text-[10px] text-teal-500 hover:text-text font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-text leading-relaxed max-h-32 overflow-y-auto select-text">
              &ldquo;{lastTranscript}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
