import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { CategorySummary } from '../../services/analytics/analyticsEngine';
import { formatCurrency } from '../../utils/currencyFormatter';
import { COLORS } from '../../constants';

interface CategoryChartProps {
  data: CategorySummary[];
  currencySymbol?: string;
}

const BAR_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

export const CategoryChart: React.FC<CategoryChartProps> = ({ data, currencySymbol = '₹' }) => {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No category expense data recorded yet.</Text>
      </View>
    );
  }

  const maxTotal = Math.max(...data.map((item) => item.total), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Category Breakdown</Text>

      {data.map((item, index) => {
        const barColor = BAR_COLORS[index % BAR_COLORS.length];
        const widthPercent = Math.max(8, Math.round((item.total / maxTotal) * 100));

        return (
          <View key={item.category} style={styles.itemRow}>
            <View style={styles.labelRow}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text style={styles.categoryAmount}>
                {formatCurrency(item.total, currencySymbol)}{' '}
                <Text style={styles.percentageText}>({item.percentage}%)</Text>
              </Text>
            </View>

            <View style={styles.barBackground}>
              <Svg height="12" width="100%">
                <Rect
                  x="0"
                  y="0"
                  width={`${widthPercent}%`}
                  height="12"
                  fill={barColor}
                  rx="6"
                  ry="6"
                />
              </Svg>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  itemRow: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  barBackground: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
