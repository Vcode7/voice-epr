import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Receipt } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDateDisplay } from '../../utils/dateUtils';
import { COLORS } from '../../constants';

interface ReceiptCardProps {
  receipt: Receipt;
  currencySymbol?: string;
  onPress: () => void;
  onShare: () => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  currencySymbol = '₹',
  onPress,
  onShare,
}) => {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="document-text" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.receiptNum}>{receipt.receiptNumber}</Text>
        </View>

        <Text style={styles.dateText}>{formatDateDisplay(receipt.date)}</Text>
      </View>

      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>
            {receipt.customerName || 'Cash / Counter Customer'}
          </Text>
          <Text style={styles.itemCount}>
            {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <Text style={styles.totalText}>{formatCurrency(receipt.grandTotal, currencySymbol)}</Text>
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.shareText}>PDF / Share</Text>
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={18} color={COLORS.textSubtle} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  receiptNum: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
