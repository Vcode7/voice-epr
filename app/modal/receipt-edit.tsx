import React, { useState, useEffect } from 'react';
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
import { ExtractedReceiptResult, ReceiptItem, InvoiceFormatType, UserSettings } from '../../src/types';
import { COLORS } from '../../src/constants';
import { receiptRepository, settingsRepository } from '../../src/repositories';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { getTodayString } from '../../src/utils/dateUtils';
import { PdfGeneratorService } from '../../src/services/pdf/pdfService';

export default function ReceiptEditModal() {
  const params = useLocalSearchParams<{ extractedJson: string }>();

  let initialItems: ReceiptItem[] = [
    { id: '1', name: 'Rice', hsnCode: '1006', quantity: 2, unit: 'kg', unitPrice: 100, lineTotal: 200 },
  ];
  let initialCustomer = '';
  let initialPhone = '';
  let initialAddress = '';
  let initialGstin = '';
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
      initialAddress = parsed.customer_address || '';
      initialGstin = parsed.customer_gstin || '';
      initialDiscount = parsed.discount || 0;
      initialTaxPercent = parsed.tax_percent || 0;
      initialTaxType = (parsed.tax_type as 'gst' | 'igst' | 'none') || 'none';

      if (parsed.items && parsed.items.length > 0) {
        initialItems = parsed.items.map((item, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          name: item.name,
          hsnCode: item.hsn_code || '',
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
  const [customerAddress, setCustomerAddress] = useState<string>(initialAddress);
  const [customerGstin, setCustomerGstin] = useState<string>(initialGstin);
  const [discountStr, setDiscountStr] = useState<string>(initialDiscount.toString());
  const [taxPercentStr, setTaxPercentStr] = useState<string>(initialTaxPercent.toString());
  const [taxType, setTaxType] = useState<'gst' | 'igst' | 'none'>(initialTaxType);
  const [format, setFormat] = useState<InvoiceFormatType>('standard');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);

  useEffect(() => {
    settingsRepository.getSettings().then((s: UserSettings) => {
      if (s?.invoiceFormat) setFormat(s.invoiceFormat);
    }).catch(() => {});
  }, []);

  // --- GST-aware Arithmetic ---
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = parseFloat(discountStr) || 0;
  const taxPercent = parseFloat(taxPercentStr) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxableAmount * taxPercent) / 100;
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
        hsnCode: '',
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
        customerAddress: customerAddress.trim() || null,
        customerGstin: customerGstin.trim() || null,
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
        notes: notes.trim() || null,
        format,
        transcript: rawTranscript,
      });

      Alert.alert(
        'Invoice Saved!',
        `Receipt ${newReceipt.receiptNumber} (${format === 'basic_tax' ? 'Basic Tax A4' : 'Standard'}) saved successfully. Would you like to share PDF?`,
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
        <Text style={styles.headerTitle}>Professional Tax Invoice</Text>
        <TouchableOpacity onPress={handleSaveReceipt} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bill To Customer Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Bill To (Customer Details)</Text>
            <Ionicons name="person-outline" size={16} color={COLORS.primary} />
          </View>
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
            placeholder="Phone Number (e.g. +91 9876543210)"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textSubtle}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={customerGstin}
            onChangeText={setCustomerGstin}
            placeholder="Customer GSTIN / Tax ID (e.g. 29ABCDE1234F1Z5)"
            autoCapitalize="characters"
            placeholderTextColor={COLORS.textSubtle}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder="Customer Billing Address (e.g. Industrial Area, City)"
            placeholderTextColor={COLORS.textSubtle}
          />
        </View>

        {/* Invoice Format Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Invoice Output Format</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity
              style={[styles.formatBtn, format === 'standard' && styles.formatBtnActive]}
              onPress={() => setFormat('standard')}
            >
              <Ionicons
                name="color-palette-outline"
                size={16}
                color={format === 'standard' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.formatBtnText, format === 'standard' && styles.formatBtnTextActive]}>
                Standard Modern
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatBtn, format === 'basic_tax' && styles.formatBtnActive]}
              onPress={() => setFormat('basic_tax')}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={format === 'basic_tax' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.formatBtnText, format === 'basic_tax' && styles.formatBtnTextActive]}>
                Basic Tax (A4 B&W)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Line Items List with HSN/SAC */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Invoice Line Items ({items.length})</Text>
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
                  placeholder="Item Name / Description"
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
                  <Text style={styles.colLabel}>HSN/SAC</Text>
                  <TextInput
                    style={styles.gridInput}
                    value={item.hsnCode || ''}
                    onChangeText={(val) => handleUpdateItem(item.id, 'hsnCode', val)}
                    placeholder="1006"
                    placeholderTextColor={COLORS.textSubtle}
                  />
                </View>

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
                  <Text style={styles.colLabel}>Total</Text>
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
          <Text style={styles.summaryTitle}>Tax & Totals Breakdown</Text>

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
                  <Text
                    style={[
                      styles.taxTypeBtnText,
                      taxType === type && styles.taxTypeBtnTextActive,
                    ]}
                  >
                    {type === 'none' ? 'None' : type === 'gst' ? 'GST' : 'IGST'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {taxType !== 'none' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST Rate (%)</Text>
              <TextInput
                style={styles.calcInput}
                value={taxPercentStr}
                onChangeText={setTaxPercentStr}
                keyboardType="decimal-pad"
                placeholder="18"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>
          )}

          {taxType === 'gst' && taxPercent > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summarySubLabel}>└ CGST ({taxPercent / 2}%)</Text>
                <Text style={styles.summarySubValue}>+{formatCurrency(cgst)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summarySubLabel}>└ SGST ({taxPercent / 2}%)</Text>
                <Text style={styles.summarySubValue}>+{formatCurrency(sgst)}</Text>
              </View>
            </>
          )}

          {taxType === 'igst' && taxPercent > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summarySubLabel}>└ IGST ({taxPercent}%)</Text>
              <Text style={styles.summarySubValue}>+{formatCurrency(igst)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Notes / Terms */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes / Remarks (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="e.g. Goods once sold will not be returned. Thank you!"
            placeholderTextColor={COLORS.textSubtle}
          />
        </View>

        <TouchableOpacity style={styles.saveBottomBtn} onPress={handleSaveReceipt}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveBottomBtnText}>Save & Generate PDF</Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
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
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  formatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
  },
  formatBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  formatBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  formatBtnTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.receiptColor,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addItemText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemRowCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.receiptColor,
    width: 24,
  },
  itemNameInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 13,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  itemGridRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  gridCol: {
    flex: 1,
  },
  gridColRight: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  colLabel: {
    fontSize: 10,
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  gridInput: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  lineTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  summarySubLabel: {
    fontSize: 12,
    color: COLORS.textSubtle,
    paddingLeft: 8,
  },
  summarySubValue: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  calcInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    width: 80,
    textAlign: 'right',
  },
  taxTypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  taxTypeBtnActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  taxTypeBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  taxTypeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saveBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.receiptColor,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBottomBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
