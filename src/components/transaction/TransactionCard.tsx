import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDateDisplay } from '../../utils/dateUtils';
import { COLORS } from '../../constants';

interface TransactionCardProps {
  transaction: Transaction;
  currencySymbol?: string;
  onPress?: () => void;
}

const getCategoryIcon = (category?: string | null): keyof typeof Ionicons.glyphMap => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('grocer')) return 'cart';
  if (cat.includes('food') || cat.includes('restaurant')) return 'restaurant';
  if (cat.includes('transport') || cat.includes('cab')) return 'car';
  if (cat.includes('fuel') || cat.includes('petrol')) return 'speedometer';
  if (cat.includes('shop')) return 'bag-handle';
  if (cat.includes('subscri') || cat.includes('entertainment')) return 'tv';
  if (cat.includes('bill') || cat.includes('rent')) return 'receipt';
  if (cat.includes('salary') || cat.includes('income')) return 'cash';
  if (cat.includes('health')) return 'medical';
  return 'wallet';
};

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  currencySymbol = '₹',
  onPress,
}) => {
  const isIncome = transaction.transactionType === 'income';
  const iconName = getCategoryIcon(transaction.category);
  const formattedAmount = formatCurrency(transaction.amount, currencySymbol);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.card}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, isIncome ? styles.iconIncome : styles.iconExpense]}>
        <Ionicons
          name={iconName}
          size={22}
          color={isIncome ? COLORS.incomeColor : COLORS.expenseColor}
        />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.merchantText} numberOfLines={1}>
          {transaction.merchant || transaction.description || transaction.category || 'Transaction'}
        </Text>
        <Text style={styles.metaText}>
          {transaction.category || 'Uncategorized'}
          {transaction.paymentMethod ? ` · ${transaction.paymentMethod}` : ''}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
          {isIncome ? `+${formattedAmount}` : formattedAmount}
        </Text>
        <Text style={styles.dateText}>{formatDateDisplay(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconExpense: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  iconIncome: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  merchantText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  expenseText: {
    color: COLORS.text,
  },
  incomeText: {
    color: COLORS.incomeColor,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
});
