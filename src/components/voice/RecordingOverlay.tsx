import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingState } from '../../types';
import { COLORS } from '../../constants';

interface RecordingOverlayProps {
  visible: boolean;
  state: RecordingState;
  durationSeconds: number;
  mode: 'expense' | 'receipt' | 'data';
  templateName?: string;
  onStop: () => void;
  onCancel: () => void;
  errorMessage: string | null;
  onRetry?: () => void;
}

export const RecordingOverlay: React.FC<RecordingOverlayProps> = ({
  visible,
  state,
  durationSeconds,
  mode,
  templateName,
  onStop,
  onCancel,
  errorMessage,
  onRetry,
}) => {
  if (!visible) return null;

  const isRecording = state === 'Recording';
  const isProcessing = ['Processing', 'Transcribing', 'Understanding'].includes(state);
  const isError = state === 'Error';

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeTitle = () => {
    if (mode === 'receipt') return 'Voice Invoice Recorder';
    if (mode === 'data') return `Voice-to-Data: ${templateName || 'Custom Template'}`;
    return 'Voice Expense Recorder';
  };

  const getSubText = () => {
    if (mode === 'receipt') {
      return 'Speak items e.g., "Rice 2 kg 100 per kg, Coconut 7 pcs 50 each"';
    }
    if (mode === 'data') {
      return 'Speak field values naturally e.g. "Part No 4029, Shift A, Opening Counter 5000, Planned 100, Produced 98, Rejection 2"';
    }
    return 'Speak naturally e.g., "I spent 450 rupees on groceries using Amazon Pay"';
  };

  const getAccentColor = () => {
    if (mode === 'data') return COLORS.dataColor;
    if (mode === 'receipt') return '#8B5CF6';
    return COLORS.primary;
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.modeTitle}>{getModeTitle()}</Text>

          {isRecording && (
            <View style={styles.centerBox}>
              <View style={[styles.pulseDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.timerText}>{formatTimer(durationSeconds)}</Text>
              <Text style={styles.subText}>{getSubText()}</Text>
            </View>
          )}

          {isProcessing && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={getAccentColor()} style={{ marginBottom: 16 }} />
              <Text style={styles.statusTitle}>
                {state === 'Transcribing'
                  ? 'Transcribing Audio with Whisper...'
                  : state === 'Understanding'
                  ? mode === 'data'
                    ? 'AI Extracting Template Data...'
                    : 'AI Understanding Intent...'
                  : 'Processing...'}
              </Text>
              <Text style={styles.subText}>Powered by Groq Whisper & Llama 3.3</Text>
            </View>
          )}

          {isError && (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle" size={48} color={COLORS.danger} style={{ marginBottom: 10 }} />
              <Text style={styles.errorTitle}>Processing Error</Text>
              <Text style={styles.errorMsg}>
                {errorMessage || "I couldn't understand the recording. Please try again."}
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            {isRecording && (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.stopBtn, { backgroundColor: getAccentColor() }]} onPress={onStop}>
                  <Ionicons name="stop-circle" size={24} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.stopText}>Done & Extract</Text>
                </TouchableOpacity>
              </>
            )}

            {isError && (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
                {onRetry && (
                  <TouchableOpacity style={[styles.stopBtn, { backgroundColor: getAccentColor() }]} onPress={onRetry}>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.stopText}>Try Again</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  centerBox: {
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  pulseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 6,
  },
  errorMsg: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  stopText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
