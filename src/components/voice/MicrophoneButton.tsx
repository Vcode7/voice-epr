import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingState } from '../../types';
import { COLORS } from '../../constants';

interface MicrophoneButtonProps {
  state: RecordingState;
  onPress: () => void;
  mode: 'expense' | 'receipt' | 'data';
  templateName?: string;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ state, onPress, mode, templateName }) => {
  const isRecording = state === 'Recording';
  const isProcessing = ['Processing', 'Transcribing', 'Understanding'].includes(state);

  const getButtonBgStyle = () => {
    if (isRecording) return styles.buttonRecording;
    if (mode === 'receipt') return styles.buttonReceipt;
    if (mode === 'data') return styles.buttonData;
    return styles.buttonExpense;
  };

  const getIconName = (): any => {
    if (isRecording) return 'stop';
    if (mode === 'receipt') return 'receipt';
    if (mode === 'data') return 'grid';
    return 'mic';
  };

  const getStatusText = () => {
    if (state === 'Ready') {
      if (mode === 'receipt') return 'Tap to Speak Invoice Items';
      if (mode === 'data') return `Tap to Speak ${templateName || 'Data Entry'}`;
      return 'Tap to Record Expense';
    }
    if (state === 'Recording') return 'Listening... Tap to Stop';
    if (state === 'Transcribing') return 'Transcribing Audio with Whisper...';
    if (state === 'Understanding') return mode === 'data' ? 'Extracting Fields with Groq AI...' : 'Extracting JSON with Groq LLM...';
    if (state === 'Processing') return 'Processing Audio...';
    return 'Ready';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={isProcessing}
        style={[styles.button, getButtonBgStyle()]}
      >
        <Ionicons name={getIconName()} size={44} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.statusText}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonExpense: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  buttonReceipt: {
    backgroundColor: '#8B5CF6', // Purple
    shadowColor: '#8B5CF6',
  },
  buttonData: {
    backgroundColor: COLORS.dataColor, // Cyan
    shadowColor: COLORS.dataColor,
  },
  buttonRecording: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  statusText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
