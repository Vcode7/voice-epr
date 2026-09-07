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
  Volume2,
  Upload,
  Info,
  HelpCircle,
} from 'lucide-react';
import { RecordingState, VoucherType } from '@/types';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';
import { VoiceAudioPlayer } from '@/components/voice/VoiceAudioPlayer';

interface VoucherRightPanelProps {
  voucherType: VoucherType;
  recordingState: RecordingState;
  durationSeconds: number;
  volumeLevel: number;
  isProcessing: boolean;
  processingStatus: string;
  errorMessage: string | null;
  lastAudioUrl: string | null;
  lastTranscript: string | null;
  onMicPress: () => void;
  onUploadAudio?: (file: File) => void;
}

export function VoucherRightPanel({
  voucherType,
  recordingState,
  durationSeconds,
  volumeLevel,
  isProcessing,
  processingStatus,
  errorMessage,
  lastAudioUrl,
  lastTranscript,
  onMicPress,
  onUploadAudio,
}: VoucherRightPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  // Example prompts per voucher type
  const promptExamples: Record<VoucherType, string[]> = {
    sales: [
      '"Sales entry from ABC Infotech to Customer XYZ Enterprises, item laptop 2 pieces at 55000 each and mouse 5 pieces"',
      '"Invoice to Apex Solutions for 3 mechanical keyboards and 1 office chair"',
    ],
    purchase: [
      '"Purchase bill from Global Tech Supplies to ABC Infotech, ergonomic chair 4 pieces at 8500 each"',
      '"Inward purchase from Global Tech Supplies invoice PUR-205 for 10 USB-C cables"',
    ],
    receipt: [
      '"Received 50,000 rupees from Customer XYZ Enterprises against invoice INV-1001 via Bank Transfer"',
      '"Customer Apex Solutions paid 12,500 cash for invoice INV-1002"',
    ],
    payment: [
      '"Paid 34,000 rupees to Supplier Global Tech Supplies against purchase invoice PUR-1001 via UPI"',
      '"Disbursed 20,000 to Global Tech Supplies by cheque number 458920"',
    ],
  };

  return (
    <div className="bg-card border border-cardBorder rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5 h-full">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-cardBorder/60 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              recordingState === 'Recording' ? 'bg-danger animate-ping' : 'bg-primary'
            }`}
          />
          <h2 className="text-sm sm:text-base font-bold text-text tracking-wide">
            Voice Dictation Console
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-textSubtle uppercase tracking-wider">
          {voucherType} Mode
        </span>
      </div>

      {/* Microphone Recording Hub */}
      <div className="flex flex-col items-center justify-center py-4 space-y-4">
        {/* Visualizer */}
        <div className="w-full flex justify-center h-12 items-center">
          <AudioVisualizer isRecording={recordingState === 'Recording'} volumeLevel={volumeLevel} />
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight transition-colors ${
              recordingState === 'Recording' ? 'text-danger animate-pulse' : 'text-text'
            }`}
          >
            {formatTimer(durationSeconds)}
          </div>
          <p className="text-[11px] text-textMuted mt-0.5">
            {recordingState === 'Recording'
              ? 'Listening to voucher command...'
              : isProcessing
              ? processingStatus || 'Processing voice entities...'
              : 'Tap mic or press Space/R to speak'}
          </p>
        </div>

        {/* Big Mic Button */}
        <div className="relative flex items-center justify-center">
          {recordingState === 'Recording' && (
            <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-danger/20 animate-ping pointer-events-none" />
          )}

          <button
            onClick={onMicPress}
            disabled={isProcessing}
            className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
              recordingState === 'Recording'
                ? 'bg-danger hover:bg-rose-600 text-white shadow-danger/40 animate-pulse ring-4 ring-danger/30'
                : 'bg-gradient-to-tr from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white shadow-primary/30'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : recordingState === 'Recording' ? (
              <Square className="w-7 h-7 fill-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-danger/15 border border-danger/40 text-danger text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audio File Upload Dropzone */}
      {onUploadAudio && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 rounded-xl border border-dashed transition-all text-center cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-cardBorder hover:border-primary/50 bg-surface/30 hover:bg-surface/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 text-textMuted text-xs">
            <Upload className="w-3.5 h-3.5 text-primary" />
            <span>
              Drop recorded audio file here or <span className="text-primary font-bold underline">browse</span>
            </span>
          </div>
        </div>
      )}

      {/* Spoken Voice Transcript Box */}
      {lastTranscript && (
        <div className="bg-surface/70 border border-cardBorder rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-textSubtle uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-primary" />
              <span>Voice Transcript</span>
            </span>

            <button
              onClick={handleCopyTranscript}
              className="px-2 py-0.5 rounded-md bg-card hover:bg-surfaceMuted border border-cardBorder text-[10px] font-semibold text-textSubtle hover:text-text flex items-center gap-1 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-text italic font-medium leading-relaxed bg-background/60 p-2.5 rounded-lg border border-cardBorder/60">
            "{lastTranscript}"
          </p>

          {lastAudioUrl && <VoiceAudioPlayer audioUrl={lastAudioUrl} />}
        </div>
      )}

      {/* Suggested Natural Phrases Box */}
      <div className="p-3 rounded-xl bg-surface/40 border border-cardBorder space-y-2 text-xs mt-auto">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-text">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          <span>How to speak your {voucherType} voucher:</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-textMuted">
          {(promptExamples[voucherType] || []).map((example, idx) => (
            <p key={idx} className="bg-background/40 p-2 rounded-lg border border-cardBorder/50 italic">
              {example}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
