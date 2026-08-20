import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '../../src/components/analytics/StatCard';
import { CategoryChart } from '../../src/components/analytics/CategoryChart';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useBudgets } from '../../src/hooks/useBudgets';
import { useDebts } from '../../src/hooks/useDebts';
import { AnalyticsEngine } from '../../src/services/analytics/analyticsEngine';
import { DEFAULT_CATEGORIES, COLORS } from '../../src/constants';
import { formatCurrency } from '../../src/utils/currencyFormatter';

export default function AnalysisScreen() {
  const { transactions, refreshTransactions } = useTransactions();
  const { budgets, refreshBudgets, saveBudget, removeBudget } = useBudgets();
  const { debts, refreshDebts, addDebt, toggleSettled } = useDebts();

  const [period, setPeriod] = useState<'this_month' | 'this_week' | 'all'>('this_month');
  const [newBudCat, setNewBudCat] = useState<string>('Groceries');
  const [newBudAmt, setNewBudAmt] = useState<string>('');
  const [showAddBudget, setShowAddBudget] = useState<boolean>(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshTransactions();
      refreshBudgets();
      refreshDebts();
    }, [refreshTransactions, refreshBudgets, refreshDebts])
  );

  const overview = AnalyticsEngine.calculateOverview(transactions, period);
  const insights = AnalyticsEngine.generateInsights(transactions, budgets);
  const budgetStatuses = AnalyticsEngine.calculateBudgetStatuses(transactions, budgets);

  const moneyOwedToMe = debts.filter((d) => d.type === 'given' && !d.settled).reduce((s, d) => s + d.amount, 0);
  const moneyIOwe = debts.filter((d) => d.type === 'borrowed' && !d.settled).reduce((s, d) => s + d.amount, 0);

  const handleCreateBudget = async () => {
    const amt = parseFloat(newBudAmt);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
      return;
    }
    await saveBudget(newBudCat, amt);
    setNewBudAmt('');
    setShowAddBudget(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Analysis</Text>

        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'this_month' && styles.periodBtnActive]}
            onPress={() => setPeriod('this_month')}
          >
            <Text style={[styles.periodText, period === 'this_month' && styles.periodTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, period === 'this_week' && styles.periodBtnActive]}
            onPress={() => setPeriod('this_week')}
          >
            <Text style={[styles.periodText, period === 'this_week' && styles.periodTextActive]}>
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodBtn, period === 'all' && styles.periodBtnActive]}
            onPress={() => setPeriod('all')}
          >
            <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stat Overview Cards */}
        <View style={styles.statsRow}>
          <StatCard title="Income" amount={overview.totalIncome} type="income" icon="arrow-down-circle" />
          <StatCard title="Expenses" amount={overview.totalExpense} type="expense" icon="arrow-up-circle" />
          <StatCard title="Balance" amount={overview.netBalance} type="balance" icon="wallet" />
        </View>

        {/* AI Insights Card */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={18} color={COLORS.accent} style={{ marginRight: 6 }} />
            <Text style={styles.insightsTitle}>AI Financial Insights</Text>
          </View>
          {insights.map((text, idx) => (
            <View key={idx} style={styles.insightRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.insightText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* SVG Category Breakdown Chart */}
        <CategoryChart data={overview.categoryBreakdown} />

        {/* Monthly Budget Tracker */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Category Budgets</Text>
            <TouchableOpacity
              style={styles.addSmallBtn}
              onPress={() => setShowAddBudget(!showAddBudget)}
            >
              <Ionicons name={showAddBudget ? 'close' : 'add'} size={16} color="#FFFFFF" />
              <Text style={styles.addSmallText}>{showAddBudget ? 'Cancel' : 'Set Budget'}</Text>
            </TouchableOpacity>
          </View>

          {showAddBudget && (
            <View style={styles.addBudgetBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, newBudCat === cat && styles.catChipActive]}
                    onPress={() => setNewBudCat(cat)}
                  >
                    <Text style={[styles.catChipText, newBudCat === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.budgetInput}
                  value={newBudAmt}
                  onChangeText={setNewBudAmt}
                  placeholder="Monthly Limit e.g. 5000"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textSubtle}
                />
                <TouchableOpacity style={styles.saveBudgetBtn} onPress={handleCreateBudget}>
                  <Text style={styles.saveBudgetText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {budgetStatuses.length === 0 ? (
            <Text style={styles.emptyText}>No budgets set yet. Speak "Set my grocery budget to 5000" or add above.</Text>
          ) : (
            budgetStatuses.map((bs) => (
              <View key={bs.budget.id} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budCatName}>{bs.budget.category}</Text>
                  <Text style={styles.budSpentText}>
                    {formatCurrency(bs.spent)} / {formatCurrency(bs.budget.amount)}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${bs.percentage}%` },
                      bs.isOverBudget
                        ? { backgroundColor: COLORS.danger }
                        : bs.isNearLimit
                        ? { backgroundColor: COLORS.accent }
                        : { backgroundColor: COLORS.primary },
                    ]}
                  />
                </View>

                <View style={styles.budFooter}>
                  <Text style={styles.percentText}>{bs.percentage}% used</Text>
                  <TouchableOpacity onPress={() => removeBudget(bs.budget.id)}>
                    <Text style={styles.removeBudText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Lending & Borrowing Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lending & Debt Summary</Text>

          <View style={styles.debtOverviewRow}>
            <View style={[styles.debtBox, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
              <Text style={styles.debtLabel}>Money Owed to Me</Text>
              <Text style={[styles.debtVal, { color: COLORS.incomeColor }]}>
                {formatCurrency(moneyOwedToMe)}
              </Text>
            </View>

            <View style={[styles.debtBox, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}>
              <Text style={styles.debtLabel}>Money I Owe</Text>
              <Text style={[styles.debtVal, { color: COLORS.danger }]}>
                {formatCurrency(moneyIOwe)}
              </Text>
            </View>
          </View>

          {debts.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.debtItemRow, d.settled && { opacity: 0.5 }]}
              onPress={() => toggleSettled(d.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{d.personName}</Text>
                <Text style={styles.debtNotes}>
                  {d.type === 'given' ? 'Lent / Owed to me' : 'Borrowed by me'}
                  {d.notes ? ` · ${d.notes}` : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.debtAmt, d.type === 'given' ? styles.givenText : styles.borrowedText]}>
                  {formatCurrency(d.amount)}
                </Text>
                <Text style={styles.settledBadge}>{d.settled ? 'Settled ✓' : 'Tap to Settle'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 14,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 12,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accent,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    color: COLORS.accent,
    marginRight: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  addBudgetBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  catChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
  },
  budgetInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    marginRight: 8,
  },
  saveBudgetBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 10,
  },
  saveBudgetText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  budgetItem: {
    marginBottom: 14,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budCatName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  budSpentText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  budFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  percentText: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  removeBudText: {
    fontSize: 11,
    color: COLORS.danger,
  },
  debtOverviewRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  debtBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  debtLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  debtVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  debtItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  debtNotes: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  debtAmt: {
    fontSize: 15,
    fontWeight: '800',
  },
  givenText: {
    color: COLORS.incomeColor,
  },
  borrowedText: {
    color: COLORS.danger,
  },
  settledBadge: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
});
