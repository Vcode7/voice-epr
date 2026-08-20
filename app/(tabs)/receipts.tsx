import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReceiptCard } from '../../src/components/receipt/ReceiptCard';
import { useReceipts } from '../../src/hooks/useReceipts';
import { Receipt } from '../../src/types';
import { COLORS } from '../../src/constants';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { formatDateDisplay } from '../../src/utils/dateUtils';
import { PdfGeneratorService } from '../../src/services/pdf/pdfService';

export default function ReceiptsScreen() {
  const { receipts, refreshReceipts, deleteReceipt } = useReceipts();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      refreshReceipts();
    }, [refreshReceipts])
  );

  const handleShare = async (receipt: Receipt) => {
    try {
      await PdfGeneratorService.shareReceiptPdf(receipt);
    } catch (e: any) {
      Alert.alert('PDF Sharing Error', e.message || 'Failed to generate PDF receipt.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Invoice', 'Are you sure you want to delete this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReceipt(id);
          setSelectedReceipt(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Invoices & Receipts</Text>
        <TouchableOpacity
          style={styles.newReceiptBtn}
          onPress={() => router.push('/')}
        >
          <Ionicons name="mic" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newReceiptText}>Voice Invoice</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {receipts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={54} color={COLORS.textSubtle} />
            <Text style={styles.emptyTitle}>No saved invoices yet</Text>
            <Text style={styles.emptySub}>
              Switch mode to "Create Receipt" on Home screen and speak your line items!
            </Text>
          </View>
        ) : (
          receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onPress={() => setSelectedReceipt(receipt)}
              onShare={() => handleShare(receipt)}
            />
          ))
        )}
      </ScrollView>

      {/* Invoice Detail Modal */}
      {selectedReceipt && (
        <Modal animationType="slide" transparent visible={!!selectedReceipt}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalReceiptNum}>{selectedReceipt.receiptNumber}</Text>
                  <Text style={styles.modalDate}>{formatDateDisplay(selectedReceipt.date)}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingVertical: 10 }}>
                <Text style={styles.customerText}>
                  Billed To: {selectedReceipt.customerName || 'Cash Customer'}
                </Text>

                {selectedReceipt.items.map((item, idx) => (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.quantity} {item.unit} × {item.name}
                    </Text>
                    <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>{formatCurrency(selectedReceipt.subtotal)}</Text>
                </View>

                {selectedReceipt.discount > 0 && (
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryVal, { color: COLORS.incomeColor }]}>
                      -{formatCurrency(selectedReceipt.discount)}
                    </Text>
                  </View>
                )}

                {selectedReceipt.taxType === 'gst' && (selectedReceipt.taxPercent > 0 || selectedReceipt.tax > 0) && (
                  <>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLabel}>CGST ({selectedReceipt.taxPercent ? selectedReceipt.taxPercent / 2 : 0}%)</Text>
                      <Text style={styles.summaryVal}>+{formatCurrency(selectedReceipt.cgst || selectedReceipt.tax / 2)}</Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLabel}>SGST ({selectedReceipt.taxPercent ? selectedReceipt.taxPercent / 2 : 0}%)</Text>
                      <Text style={styles.summaryVal}>+{formatCurrency(selectedReceipt.sgst || selectedReceipt.tax / 2)}</Text>
                    </View>
                  </>
                )}

                {selectedReceipt.taxType === 'igst' && (selectedReceipt.taxPercent > 0 || selectedReceipt.tax > 0) && (
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>IGST ({selectedReceipt.taxPercent}%)</Text>
                    <Text style={styles.summaryVal}>+{formatCurrency(selectedReceipt.igst || selectedReceipt.tax)}</Text>
                  </View>
                )}

                {selectedReceipt.taxType !== 'gst' && selectedReceipt.taxType !== 'igst' && selectedReceipt.tax > 0 && (
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Tax</Text>
                    <Text style={styles.summaryVal}>+{formatCurrency(selectedReceipt.tax)}</Text>
                  </View>
                )}

                <View style={[styles.summaryLine, styles.totalLine]}>
                  <Text style={styles.totalLabel}>GRAND TOTAL</Text>
                  <Text style={styles.totalVal}>{formatCurrency(selectedReceipt.grandTotal)}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(selectedReceipt.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShare(selectedReceipt)}
                >
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Generate & Share PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  newReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newReceiptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingBottom: 12,
  },
  modalReceiptNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  customerText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 10,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalLine: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtn: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    marginRight: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
