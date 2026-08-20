import { useState, useRef, useEffect, useCallback } from 'react';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
  RecordingPresets,
} from 'expo-audio';
import { RecordingState } from '../types';

export interface UseAudioRecorderReturn {
  state: RecordingState;
  durationSeconds: number;
  audioUri: string | null;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  resetRecorder: () => void;
  setState: (state: RecordingState) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<RecordingState>('Ready');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRecorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      setAudioUri(null);
      setDurationSeconds(0);

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Microphone permission is required to record voice notes.');
        setState('Error');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setState('Recording');

      clearTimer();
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[AudioRecorder] Failed to start recording:', err);
      setErrorMessage(err.message || 'Could not start microphone recording.');
      setState('Error');
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimer();

    try {
      setState('Processing');
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      await setAudioModeAsync({
        allowsRecording: false,
      });

      if (uri) {
        setAudioUri(uri);
        return uri;
      }
      throw new Error('Audio recording URI was empty.');
    } catch (err: any) {
      console.error('[AudioRecorder] Failed to stop recording:', err);
      setErrorMessage('Failed to finalize audio recording.');
      setState('Error');
      return null;
    }
  }, [audioRecorder]);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    setDurationSeconds(0);
    try {
      await audioRecorder.stop();
    } catch {}
    setAudioUri(null);
    setState('Ready');
  }, [audioRecorder]);

  const resetRecorder = useCallback(() => {
    clearTimer();
    setDurationSeconds(0);
    setAudioUri(null);
    setErrorMessage(null);
    setState('Ready');
  }, []);

  return {
    state,
    durationSeconds,
    audioUri,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecorder,
    setState,
    setErrorMessage,
  };
};
