import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';
import { GroqService } from '../../src/services/groq/groqService';
import { transactionRepository } from '../../src/repositories';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { isThisMonth } from '../../src/utils/dateUtils';

export default function QueryModal() {
  const recorder = useAudioRecorder();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRecordToggle = async () => {
    if (recorder.state === 'Recording') {
      const uri = await recorder.stopRecording();
      if (!uri) return;

      try {
        setLoading(true);
        recorder.setState('Transcribing');
        const text = await GroqService.transcribeAudio(uri);
        setTranscript(text);

        recorder.setState('Understanding');
        const parsedQuery = await GroqService.parseFinancialQuery(text);

        // --- Deterministic local calculations ---
        const allTransactions = await transactionRepository.getTransactions();
        let computedAnswer = '';

        if (parsedQuery.queryType === 'category_total' && parsedQuery.category) {
          const categoryTx = allTransactions.filter(
            (t) =>
              (t.category || '').toLowerCase() === parsedQuery.category?.toLowerCase() &&
              t.transactionType === 'expense' &&
              isThisMonth(t.date)
          );
          const total = categoryTx.reduce((sum, t) => sum + t.amount, 0);
          computedAnswer = `You spent ${formatCurrency(total)} on ${parsedQuery.category} this month across ${categoryTx.length} transactions.`;
        } else if (parsedQuery.queryType === 'biggest_expense') {
          const expenses = allTransactions.filter((t) => t.transactionType === 'expense' && isThisMonth(t.date));
          if (expenses.length === 0) {
            computedAnswer = 'No expenses recorded this month yet.';
          } else {
            const maxTx = expenses.reduce((max, t) => (t.amount > max.amount ? t : max), expenses[0]);
            computedAnswer = `Your biggest expense this month was ${formatCurrency(maxTx.amount)} at ${maxTx.merchant || maxTx.category || 'Merchant'}.`;
          }
        } else if (parsedQuery.queryType === 'payment_method_total') {
          const methodTx = allTransactions.filter(
            (t) => (t.paymentMethod || '').toLowerCase().includes((parsedQuery.paymentMethod || '').toLowerCase())
          );
          const total = methodTx.reduce((sum, t) => sum + t.amount, 0);
          computedAnswer = `Total spent using ${parsedQuery.paymentMethod || 'this method'} is ${formatCurrency(total)}.`;
        } else {
          // General fallback calculate monthly expense sum
          const monthly = allTransactions.filter((t) => isThisMonth(t.date) && t.transactionType === 'expense');
          const total = monthly.reduce((sum, t) => sum + t.amount, 0);
          computedAnswer = `Your total expenses for this month stand at ${formatCurrency(total)}.`;
        }

        setAnswer(computedAnswer);
      } catch (err: any) {
        setAnswer(err.message || 'Could not process financial query.');
      } finally {
        setLoading(false);
        recorder.resetRecorder();
      }
    } else {
      await recorder.startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ask Voice Finance</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Ask natural questions like "How much did I spend on groceries this month?" or "What was my largest expense?"
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleRecordToggle}
          disabled={loading}
          style={[styles.micBtn, recorder.state === 'Recording' && styles.micBtnRecording]}
        >
          <Ionicons
            name={recorder.state === 'Recording' ? 'stop' : 'mic'}
            size={48}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.statusText}>
          {recorder.state === 'Recording'
            ? 'Listening... Tap to Stop'
            : loading
            ? 'Calculating from local database...'
            : 'Tap mic to ask a question'}
        </Text>

        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}

        {transcript && (
          <View style={styles.transcriptBox}>
            <Text style={styles.boxLabel}>You Asked:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        )}

        {answer && (
          <View style={styles.answerBox}>
            <Ionicons name="sparkles" size={24} color={COLORS.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.boxLabel}>Answer:</Text>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  micBtnRecording: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 16,
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  answerBox: {
    width: '100%',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  boxLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 15,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  answerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
  },
});
