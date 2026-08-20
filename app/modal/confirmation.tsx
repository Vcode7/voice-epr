import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExtractedIntentResult, FinancialIntent, TransactionType } from '../../src/types';
import { DEFAULT_CATEGORIES, PAYMENT_METHOD_CATEGORIES, COLORS } from '../../src/constants';
import { transactionRepository, debtRepository, budgetRepository } from '../../src/repositories';
import { getTodayString } from '../../src/utils/dateUtils';

interface EditableEntry {
  id: string;
  intent: FinancialIntent;
  amount: string;
  merchant: string;
  category: string;
  paymentMethod: string;
  transactionType: TransactionType;
  description: string;
  date: string;
  personName: string;
  targetCategory: string;
}

export default function ConfirmationModal() {
  const params = useLocalSearchParams<{ extractedJson: string }>();

  let initial: ExtractedIntentResult = {
    intent: 'expense',
    amount: 0,
    currency: 'INR',
    merchant: '',
    category: 'Groceries',
    payment_method: null,
    transaction_type: 'expense',
    description: '',
    date: null,
    person_name: null,
    target_category: null,
  };

  try {
    if (params.extractedJson) {
      initial = JSON.parse(params.extractedJson);
    }
  } catch {}

  const rawEntries =
    initial.transactions && initial.transactions.length > 0
      ? initial.transactions
      : initial.entries && initial.entries.length > 0
      ? initial.entries
      : [initial];

  const [entriesList, setEntriesList] = useState<EditableEntry[]>(
    rawEntries.map((item, index) => ({
      id: `entry-${index}-${Date.now()}`,
      intent: item.intent || 'expense',
      amount: item.amount !== null && item.amount !== undefined ? item.amount.toString() : '',
      merchant: item.merchant || item.person_name || '',
      category: item.category || 'Other',
      paymentMethod: item.payment_method || '',
      transactionType: item.transaction_type || (item.intent === 'income' ? 'income' : 'expense'),
      description: item.description || '',
      date: item.date || getTodayString(),
      personName: item.person_name || '',
      targetCategory: item.target_category || '',
    }))
  );

  const updateEntry = (index: number, field: keyof EditableEntry, value: any) => {
    setEntriesList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addEntry = () => {
    setEntriesList((prev) => [
      ...prev,
      {
        id: `entry-${prev.length}-${Date.now()}`,
        intent: 'expense',
        amount: '',
        merchant: '',
        category: 'Other',
        paymentMethod: '',
        transactionType: 'expense',
        description: '',
        date: getTodayString(),
        personName: '',
        targetCategory: '',
      },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entriesList.length <= 1) {
      Alert.alert('Cannot Remove', 'You must keep at least one entry.');
      return;
    }
    setEntriesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    for (let i = 0; i < entriesList.length; i++) {
      const item = entriesList[i];
      const parsedAmount = parseFloat(item.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert('Invalid Amount', `Entry #${i + 1} (${item.merchant || 'Item'}) has an invalid amount.`);
        return;
      }
    }

    try {
      for (const item of entriesList) {
        const parsedAmount = parseFloat(item.amount);
        const merchantName = item.merchant.trim();
        const paymentMethodValue = item.paymentMethod.trim() || null;

        if (item.intent === 'budget' && item.targetCategory) {
          await budgetRepository.setBudget(item.targetCategory, parsedAmount);
        } else if (item.intent === 'lend' && merchantName) {
          await debtRepository.recordDebt(merchantName, parsedAmount, 'given', item.description);
        } else if (item.intent === 'borrow' && merchantName) {
          await debtRepository.recordDebt(merchantName, parsedAmount, 'borrowed', item.description);
        } else if (item.intent === 'repayment' && merchantName) {
          await debtRepository.recordRepayment(merchantName, parsedAmount);
        }

        await transactionRepository.createTransaction({
          amount: parsedAmount,
          currency: 'INR',
          merchant: merchantName || null,
          category: item.category || 'Other',
          paymentMethod: paymentMethodValue,
          transactionType: item.transactionType,
          description: item.description.trim() || `Paid ${parsedAmount} for ${item.category}`,
          transcript: initial.raw_transcript || null,
          date: item.date || getTodayString(),
        });
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Storage Error', e.message || 'Failed to save transactions.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Review & Confirm ({entriesList.length} {entriesList.length === 1 ? 'Entry' : 'Entries'})
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save ({entriesList.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.detectedTitle}>
          {entriesList.length > 1
            ? `MULTIPLE ENTRIES DETECTED (${entriesList.length})`
            : `${entriesList[0]?.intent.toUpperCase() || 'EXPENSE'} DETECTED`}
        </Text>

        {entriesList.map((entry, index) => (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardBadge}>
                <Ionicons name="receipt-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.cardBadgeText}>Entry #{index + 1}</Text>
              </View>

              {entriesList.length > 1 && (
                <TouchableOpacity onPress={() => removeEntry(index)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>

            {/* Transaction Type Toggle */}
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, entry.transactionType === 'expense' && styles.typeExpenseActive]}
                onPress={() => updateEntry(index, 'transactionType', 'expense')}
              >
                <Text
                  style={[
                    styles.typeText,
                    entry.transactionType === 'expense' && styles.typeTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, entry.transactionType === 'income' && styles.typeIncomeActive]}
                onPress={() => updateEntry(index, 'transactionType', 'income')}
              >
                <Text
                  style={[
                    styles.typeText,
                    entry.transactionType === 'income' && styles.typeTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.amountInput}
                value={entry.amount}
                onChangeText={(val) => updateEntry(index, 'amount', val)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>

            {/* Merchant / Person Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Merchant / Payee / Person</Text>
              <TextInput
                style={styles.input}
                value={entry.merchant}
                onChangeText={(val) => updateEntry(index, 'merchant', val)}
                placeholder="e.g. Netflix, Amazon Prime, Swiggy, Rahul"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>

            {/* Category Picker Chips */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, entry.category === cat && styles.chipActive]}
                    onPress={() => updateEntry(index, 'category', cat)}
                  >
                    <Text style={[styles.chipText, entry.category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Payment Method Chips Grouped by Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              {PAYMENT_METHOD_CATEGORIES.map((catGroup) => (
                <View key={catGroup.category} style={styles.categorySubGroup}>
                  <Text style={styles.categorySubGroupLabel}>{catGroup.category}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {catGroup.methods.map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.chip, entry.paymentMethod === method && styles.chipActive]}
                        onPress={() =>
                          updateEntry(
                            index,
                            'paymentMethod',
                            entry.paymentMethod === method ? '' : method
                          )
                        }
                      >
                        <Text style={[styles.chipText, entry.paymentMethod === method && styles.chipTextActive]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>

            {/* Description Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description / Notes</Text>
              <TextInput
                style={styles.input}
                value={entry.description}
                onChangeText={(val) => updateEntry(index, 'description', val)}
                placeholder="Optional notes"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>
          </View>
        ))}

        {/* Add Another Entry Button */}
        <TouchableOpacity style={styles.addEntryBtn} onPress={addEntry}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.addEntryText}>Add Another Entry</Text>
        </TouchableOpacity>

        {initial.raw_transcript && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>Original Voice Transcript:</Text>
            <Text style={styles.transcriptText}>"{initial.raw_transcript}"</Text>
          </View>
        )}

        <TouchableOpacity style={styles.confirmSaveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.confirmSaveText}>
            Confirm & Save All ({entriesList.length} {entriesList.length === 1 ? 'Entry' : 'Entries'})
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveHeaderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  detectedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  deleteBtn: {
    padding: 6,
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeExpenseActive: {
    backgroundColor: COLORS.danger,
  },
  typeIncomeActive: {
    backgroundColor: COLORS.incomeColor,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addEntryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  transcriptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.text,
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 30,
  },
  confirmSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  categorySubGroup: {
    marginBottom: 8,
  },
  categorySubGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
});

