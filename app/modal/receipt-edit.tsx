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
import { ExtractedReceiptResult, ReceiptItem } from '../../src/types';
import { COLORS } from '../../src/constants';
import { receiptRepository } from '../../src/repositories';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { getTodayString } from '../../src/utils/dateUtils';
import { PdfGeneratorService } from '../../src/services/pdf/pdfService';

export default function ReceiptEditModal() {
  const params = useLocalSearchParams<{ extractedJson: string }>();

  let initialItems: ReceiptItem[] = [
    { id: '1', name: 'Rice', quantity: 2, unit: 'kg', unitPrice: 100, lineTotal: 200 },
  ];
  let initialCustomer = '';
  let initialPhone = '';
  let initialDiscount = 0;
  let initialTaxPercent = 0;
  let initialTaxType: 'gst' | 'igst' | 'none' = 'none';
  let rawTranscript = '';

  try {
    if (params.extractedJson) {
      const parsed: ExtractedReceiptResult = JSON.parse(params.extractedJson);
      rawTranscript = parsed.raw_transcript || '';
      initialCustomer = parsed.customer_name || '';
      initialPhone = parsed.customer_phone || '';
      initialDiscount = parsed.discount || 0;
      initialTaxPercent = parsed.tax_percent || 0;
      initialTaxType = (parsed.tax_type as 'gst' | 'igst' | 'none') || 'none';

      if (parsed.items && parsed.items.length > 0) {
        initialItems = parsed.items.map((item, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          unitPrice: item.unit_price || 0,
          lineTotal: (item.quantity || 1) * (item.unit_price || 0),
        }));
      }
    }
  } catch {}

  const [customerName, setCustomerName] = useState<string>(initialCustomer);
  const [customerPhone, setCustomerPhone] = useState<string>(initialPhone);
  const [discountStr, setDiscountStr] = useState<string>(initialDiscount.toString());
  const [taxPercentStr, setTaxPercentStr] = useState<string>(initialTaxPercent.toString());
  const [taxType, setTaxType] = useState<'gst' | 'igst' | 'none'>(initialTaxType);
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);

  // --- GST-aware Arithmetic ---
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = parseFloat(discountStr) || 0;
  const taxPercent = parseFloat(taxPercentStr) || 0;
  const taxAmount = Math.round(subtotal * taxPercent) / 100;
  // CGST + SGST split equally when taxType === 'gst'; IGST is full when taxType === 'igst'
  const cgst = taxType === 'gst' ? Math.round(taxAmount / 2 * 100) / 100 : 0;
  const sgst = taxType === 'gst' ? Math.round(taxAmount / 2 * 100) / 100 : 0;
  const igst = taxType === 'igst' ? taxAmount : 0;
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);

  const handleUpdateItem = (id: string, key: keyof ReceiptItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [key]: value };
        if (key === 'quantity' || key === 'unitPrice') {
          const qty = key === 'quantity' ? parseFloat(value) || 0 : item.quantity;
          const price = key === 'unitPrice' ? parseFloat(value) || 0 : item.unitPrice;
          updated.lineTotal = qty * price;
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: 'New Item',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 50,
        lineTotal: 50,
      },
    ]);
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Cannot Remove', 'Receipt must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveReceipt = async () => {
    try {
      const receiptNumber = await receiptRepository.getNextReceiptNumber();
      const newReceipt = await receiptRepository.createReceipt({
        receiptNumber,
        date: getTodayString(),
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        items,
        subtotal,
        discount,
        tax: taxAmount,
        taxPercent,
        taxType,
        cgst,
        sgst,
        igst,
        grandTotal,
        currency: 'INR',
        transcript: rawTranscript,
      });

      Alert.alert(
        'Invoice Saved!',
        `Receipt ${newReceipt.receiptNumber} saved successfully. Would you like to share PDF?`,
        [
          { text: 'Done', onPress: () => router.back() },
          {
            text: 'Share PDF',
            onPress: async () => {
              try {
                await PdfGeneratorService.shareReceiptPdf(newReceipt);
              } catch (err: any) {
                Alert.alert('Error', err.message);
              } finally {
                router.back();
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save receipt.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice & Receipt Editor</Text>
        <TouchableOpacity onPress={handleSaveReceipt} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Info (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Customer Name (e.g. Ramesh Kumar)"
            placeholderTextColor={COLORS.textSubtle}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Customer Phone (e.g. +91 9876543210)"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textSubtle}
          />
        </View>

        {/* Line Items List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Invoice Items</Text>
            <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View key={item.id} style={styles.itemRowCard}>
              <View style={styles.itemHeaderRow}>
                <Text style={styles.itemNumText}>#{idx + 1}</Text>
                <TextInput
                  style={[styles.input, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(val) => handleUpdateItem(item.id, 'name', val)}
                  placeholder="Item Name"
                  placeholderTextColor={COLORS.textSubtle}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteItem(item.id)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.itemGridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.colLabel}>Qty</Text>
                  <TextInput
                    style={styles.gridInput}
                    value={item.quantity.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'quantity', val)}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.gridCol}>
                  <Text style={styles.colLabel}>Unit</Text>
                  <TextInput
                    style={styles.gridInput}
                    value={item.unit}
                    onChangeText={(val) => handleUpdateItem(item.id, 'unit', val)}
                  />
                </View>

                <View style={styles.gridCol}>
                  <Text style={styles.colLabel}>Price (₹)</Text>
                  <TextInput
                    style={styles.gridInput}
                    value={item.unitPrice.toString()}
                    onChangeText={(val) => handleUpdateItem(item.id, 'unitPrice', val)}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.gridColRight}>
                  <Text style={styles.colLabel}>Line Total</Text>
                  <Text style={styles.lineTotalText}>
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Calculation Summary Box */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Recalculated Totals</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount (₹)</Text>
            <TextInput
              style={styles.calcInput}
              value={discountStr}
              onChangeText={setDiscountStr}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Tax Type Selector */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax Type</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['none', 'gst', 'igst'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setTaxType(type)}
                  style={[
                    styles.taxTypeBtn,
                    taxType === type && styles.taxTypeBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.taxTypeBtnText,
                    taxType === type && styles.taxTypeBtnTextActive,
                  ]}>
                    {type === 'none' ? 'None' : type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tax Percent Input */}
          {taxType !== 'none' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax Rate (%)</Text>
              <TextInput
                style={styles.calcInput}
                value={taxPercentStr}
                onChangeText={setTaxPercentStr}
                keyboardType="decimal-pad"
                placeholder="e.g. 18"
                placeholderTextColor="#666"
              />
            </View>
          )}

          {/* GST Breakdown */}
          {taxType === 'gst' && taxPercent > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST ({taxPercent / 2}%)</Text>
                <Text style={styles.summaryValue}>₹{cgst.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST ({taxPercent / 2}%)</Text>
                <Text style={styles.summaryValue}>₹{sgst.toFixed(2)}</Text>
              </View>
            </>
          )}
          {taxType === 'igst' && taxPercent > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IGST ({taxPercent}%)</Text>
              <Text style={styles.summaryValue}>₹{igst.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primarySaveBtn} onPress={handleSaveReceipt}>
          <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primarySaveText}>Save & Generate Invoice</Text>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveHeaderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
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
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addItemText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  itemRowCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 8,
  },
  itemNameInput: {
    flex: 1,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  itemGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridCol: {
    flex: 1,
    marginRight: 6,
  },
  gridColRight: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  colLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  gridInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
  },
  lineTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.incomeColor,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  calcInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    textAlign: 'right',
    color: COLORS.text,
    fontWeight: '700',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 40,
  },
  primarySaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  taxTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.inputBg,
  },
  taxTypeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  taxTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  taxTypeBtnTextActive: {
    color: '#FFFFFF',
  },
});
