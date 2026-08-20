import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/currencyFormatter';
import { COLORS } from '../../constants';

interface StatCardProps {
  title: string;
  amount: number;
  currencySymbol?: string;
  type: 'income' | 'expense' | 'balance';
  icon: keyof typeof Ionicons.glyphMap;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  currencySymbol = '₹',
  type,
  icon,
}) => {
  const isIncome = type === 'income';
  const isExpense = type === 'expense';

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconBox,
          isIncome ? styles.incomeIcon : isExpense ? styles.expenseIcon : styles.balanceIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isIncome ? COLORS.incomeColor : isExpense ? COLORS.expenseColor : COLORS.primary}
        />
      </View>

      <Text style={styles.titleText}>{title}</Text>
      <Text
        style={[
          styles.amountText,
          isIncome ? styles.incomeText : isExpense ? styles.expenseText : styles.balanceText,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(amount, currencySymbol)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 4,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  incomeIcon: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  expenseIcon: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  balanceIcon: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  titleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  incomeText: {
    color: COLORS.incomeColor,
  },
  expenseText: {
    color: COLORS.expenseColor,
  },
  balanceText: {
    color: COLORS.text,
  },
});
