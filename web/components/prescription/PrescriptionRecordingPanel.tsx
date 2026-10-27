'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  CheckCircle2,
  User,
  Pill,
} from 'lucide-react';
import { RecordingState } from '@/types';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';

export type ProcessingStage = 'transcribing' | 'extracting' | null;

export interface ExtractionSummary {
  /** Patient-level fields that were found (empty ones are left out). */
  patient: Array<{ label: string; value: string }>;
  /** One record per medicine, keyed by column name. */
  medicines: Array<Record<string, string>>;
}

interface PrescriptionRecordingPanelProps {
  recordingState: RecordingState;
  durationSeconds: number;
  volumeLevel: number;
  isProcessing: boolean;
  processingStatus: string;
  processingStage: ProcessingStage;
  extraction: ExtractionSummary | null;
  errorMessage: string | null;
  lastTranscript: string | null;
  onMicPress: () => void;
  onUploadAudio: (file: File) => void;
  onExtractText: (text: string) => void;
}

/** Field name shown to the user, and the word to say / type so the right field is filled. */
const PATIENT_FIELDS = [
  { label: 'Patient name', say: 'patient name' },
  { label: 'Age', say: 'age' },
  { label: 'Gender', say: 'gender' },
  { label: 'Phone', say: 'phone' },
  { label: 'Diagnosis', say: 'diagnosis' },
];

/** Same column names as the medicine table on the right. */
const MEDICINE_FIELDS: Array<{ label: string; say: string; hint?: string }> = [
  { label: 'Medicine name', say: 'medicine' },
  { label: 'Dosage', say: 'dosage' },
  { label: 'Frequency', say: 'frequency', hint: 'digits, e.g. 1 0 1' },
  { label: 'Duration', say: 'duration' },
  { label: 'Timing', say: 'timing', hint: 'before / after food' },
  { label: 'Instructions', say: 'instructions' },
];

const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|webm|ogg|aac|flac|mp4)$/i;

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function FieldChip({ label, say, hint }: { label: string; say: string; hint?: string }) {
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-[11px] leading-tight">
      <div className="font-bold text-text">{label}</div>
      <div className="text-textMuted">
        say &ldquo;<span className="text-teal-600 dark:text-teal-400 font-semibold">{say}</span>&rdquo;
        {hint && <span className="text-textSubtle"> · {hint}</span>}
      </div>
    </div>
  );
}

/** Which fields to say (or type), with the exact word that fills each one. */
function FieldGuide({ verb }: { verb: 'Say' | 'Type' }) {
  return (
    <div className="rounded-xl bg-surface/60 border border-cardBorder p-3.5 space-y-3">
      <p className="text-xs font-bold text-text">{verb} now — name each field, then its value:</p>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-textSubtle tracking-wider flex items-center gap-1">
          <User className="w-3 h-3 text-teal-500" /> Patient
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT_FIELDS.map((f) => (
            <FieldChip key={f.label} {...f} />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-textSubtle tracking-wider flex items-center gap-1">
          <Pill className="w-3 h-3 text-teal-500" /> Medicine — repeat for each one
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MEDICINE_FIELDS.map((f) => (
            <FieldChip key={f.label} {...f} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Shown while the input is being turned into fields: names every field that is being read. */
function ProcessingFields({ stage }: { stage: ProcessingStage }) {
  const transcribing = stage === 'transcribing';
  const labels = [...PATIENT_FIELDS.map((f) => f.label), ...MEDICINE_FIELDS.map((f) => f.label)];

  return (
    <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-3.5 space-y-3" aria-live="polite">
      <div className="space-y-1.5 text-xs font-semibold">
        {stage !== null && (
          <>
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
              {transcribing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{transcribing ? 'Transcribing what you said' : 'Input received'}</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                transcribing ? 'text-textSubtle' : 'text-teal-700 dark:text-teal-300'
              }`}
            >
              {transcribing ? (
                <span className="w-3.5 h-3.5 rounded-full border border-cardBorder shrink-0" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              )}
              <span>Reading each field</span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label}
            className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${
              transcribing
                ? 'border-cardBorder text-textSubtle bg-background/60'
                : 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-background/60 animate-pulse'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** What was actually heard, field by field, with the medicine column names. */
function ExtractedFields({ extraction }: { extraction: ExtractionSummary }) {
  return (
    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-3">
      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4" /> Extracted fields
      </div>

      {extraction.patient.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {extraction.patient.map((f) => (
            <React.Fragment key={f.label}>
              <dt className="text-textMuted font-semibold">{f.label}</dt>
              <dd className="text-text font-bold break-words">{f.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      ) : (
        <p className="text-[11px] text-textMuted">No patient fields heard.</p>
      )}

      {extraction.medicines.length > 0 ? (
        extraction.medicines.map((med, i) => (
          <div key={i} className="rounded-lg bg-background/70 border border-cardBorder p-2.5 space-y-1">
            <div className="text-[10px] uppercase font-bold text-textSubtle tracking-wider">Medicine {i + 1}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {MEDICINE_FIELDS.map((f) => (
                <React.Fragment key={f.label}>
                  <dt className="text-textMuted font-semibold">{f.label}</dt>
                  <dd className={med[f.label] ? 'text-text font-bold break-words' : 'text-textSubtle'}>
                    {med[f.label] || '— not heard'}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ))
      ) : (
        <p className="text-[11px] text-textMuted">
          No medicines heard — say &ldquo;medicine&rdquo; followed by the name.
        </p>
      )}
    </div>
  );
}

export function PrescriptionRecordingPanel({
  recordingState,
  durationSeconds,
  volumeLevel,
  isProcessing,
  processingStatus,
  processingStage,
  extraction,
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isRecording = recordingState === 'Recording';

  // Manual entry: put the cursor in the text field straight away.
  useEffect(() => {
    if (mode === 'text') textAreaRef.current?.focus();
  }, [mode]);

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
              { id: 'text', label: 'Manual entry', icon: FileText },
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
                {isRecording && <AudioVisualizer isRecording={isRecording} volumeLevel={volumeLevel} />}
              </div>
            </div>

            {isProcessing ? <ProcessingFields stage={processingStage} /> : <FieldGuide verb="Say" />}

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
            <FieldGuide verb="Type" />
            <textarea
              ref={textAreaRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              aria-label="Prescription text"
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
            {isProcessing && <ProcessingFields stage={processingStage} />}
          </form>
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

        {!isProcessing && extraction && <ExtractedFields extraction={extraction} />}

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
