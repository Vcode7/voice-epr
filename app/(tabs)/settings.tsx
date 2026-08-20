import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, COLORS, DEFAULT_SETTINGS } from '../../src/constants';
import {
  settingsRepository,
  transactionRepository,
  receiptRepository,
  budgetRepository,
  debtRepository,
  dataEntryRepository,
} from '../../src/repositories';
import { UserSettings, InvoiceFormatType, BankDetails, Receipt } from '../../src/types';
import { GroqService } from '../../src/services/groq/groqService';
import { seedDemoData } from '../../src/utils/sampleDataGenerator';
import { ExportImportService } from '../../src/services/exportImportService';
import { router } from 'expo-router';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { formatDateDisplay } from '../../src/utils/dateUtils';
import { numberToWords } from '../../src/utils/numberToWords';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: DEFAULT_SETTINGS.bankDetails?.bankName || 'HDFC Bank',
    accountHolder: DEFAULT_SETTINGS.bankDetails?.accountHolder || 'My Enterprise / Shop',
    accountNumber: DEFAULT_SETTINGS.bankDetails?.accountNumber || '50200012345678',
    ifsc: DEFAULT_SETTINGS.bankDetails?.ifsc || 'HDFC0001234',
    branch: DEFAULT_SETTINGS.bankDetails?.branch || 'Main City Branch',
  });
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormatType>('standard');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<InvoiceFormatType>('standard');

  const [keyStatus, setKeyStatus] = useState<{
    hasEnvKey: boolean;
    hasCustomKey: boolean;
    isConfigured: boolean;
    activeKeyType: string;
  }>({
    hasEnvKey: false,
    hasCustomKey: false,
    isConfigured: false,
    activeKeyType: 'none',
  });
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const loadSettings = async () => {
    const data = await settingsRepository.getSettings();
    setSettings(data);
    setApiKeyInput(data.customGroqApiKey || '');
    if (data.bankDetails) setBankDetails(data.bankDetails);
    if (data.invoiceFormat) {
      setInvoiceFormat(data.invoiceFormat);
      setPreviewTab(data.invoiceFormat);
    }
    const status = await GroqService.getKeyStatus();
    setKeyStatus(status);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  const handleSaveSettings = async () => {
    const updated = await settingsRepository.updateSettings({
      ...settings,
      bankDetails,
      invoiceFormat,
      customGroqApiKey: apiKeyInput.trim(),
    });
    setSettings(updated);
    const status = await GroqService.getKeyStatus();
    setKeyStatus(status);
    Alert.alert('Settings Saved', 'Business profile, bank details, and invoice format updated successfully.');
  };

  const handleSelectFormat = async (format: InvoiceFormatType) => {
    setInvoiceFormat(format);
    const updated = await settingsRepository.updateSettings({
      ...settings,
      bankDetails,
      invoiceFormat: format,
    });
    setSettings(updated);
  };

  const handleSelectCurrency = async (code: string, symbol: string) => {
    const updated = await settingsRepository.updateSettings({
      currency: code,
      currencySymbol: symbol,
    });
    setSettings(updated);
  };

  const handleLoadDemoData = async () => {
    Alert.alert(
      'Load Sample Demo Data',
      'This will seed sample transactions (Groceries, Salary, etc.), receipts, and Voice-to-Data records for the default Monitoring Details template.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Demo Data',
          onPress: async () => {
            const stats = await seedDemoData();
            Alert.alert(
              'Demo Data Seeded!',
              `Loaded ${stats.transactionsCount} transactions, ${stats.receiptsCount} receipts, ${stats.dataEntriesCount} Voice-to-Data records, ${stats.budgetsCount} budgets, and ${stats.debtsCount} debt items.`
            );
          },
        },
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Local Data',
      'Are you sure you want to delete all stored transactions, receipts, Voice-to-Data entries, budgets, and debts? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: async () => {
            await transactionRepository.clearAllTransactions();
            await receiptRepository.clearAllReceipts();
            await dataEntryRepository.clearAllDataEntries();
            await budgetRepository.clearAllBudgets();
            await debtRepository.clearAllDebts();
            Alert.alert('Cleared', 'All local transactions, receipts, and Voice-to-Data records have been wiped.');
          },
        },
      ]
    );
  };

  const handleExportHistory = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      const res = await ExportImportService.exportHistory(format);
      Alert.alert(
        'Export Complete',
        `Successfully generated ${format.toUpperCase()} export file with ${res.count} records.`
      );
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export history.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportHistory = async () => {
    try {
      setIsImporting(true);
      const result = await ExportImportService.importHistory();
      if (!result) return;

      if (result.errors && result.errors.length > 0 && result.importedCount === 0 && result.skippedCount === 0) {
        Alert.alert('Import Failed', result.errors.join('\n'));
        return;
      }

      Alert.alert(
        'Import Complete',
        `${result.totalFound} transactions found\n${result.importedCount} imported\n${result.skippedCount} skipped`,
        [{ text: 'Done' }]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'Could not import history file.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings & Enterprise</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Groq API Status & Rate Limit Backup */}
        <View style={styles.sectionCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={keyStatus.isConfigured ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={keyStatus.isConfigured ? COLORS.success : COLORS.warning}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.statusTitle}>
                {keyStatus.isConfigured ? 'Groq Voice AI Active' : 'Groq API Key Missing'}
              </Text>
              <Text style={styles.statusSub}>
                {keyStatus.hasEnvKey
                  ? 'Primary key active (.env). Add a backup key below to prevent rate limit interruptions.'
                  : keyStatus.hasCustomKey
                  ? 'Backup key active.'
                  : 'Add a Groq API key below or set EXPO_PUBLIC_GROQ_API_KEY in .env.'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {keyStatus.hasEnvKey ? 'Backup Groq API Key (Rate Limit Failover)' : 'Groq API Key'}
            </Text>
            <TextInput
              style={styles.input}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="gsk_..."
              secureTextEntry
              placeholderTextColor={COLORS.textSubtle}
            />
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
              Used automatically if your primary .env key reaches Groq rate limits (HTTP 429).
            </Text>
          </View>
        </View>

        {/* Invoice Format Selector Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Default Invoice Format</Text>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setShowPreviewModal(true)}
            >
              <Ionicons name="eye-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.previewBtnText}>Preview Formats</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 16 }}>
            Select the default layout template used when generating and sharing PDF invoices.
          </Text>

          <View style={styles.formatChoiceRow}>
            <TouchableOpacity
              style={[styles.formatChoiceCard, invoiceFormat === 'standard' && styles.formatChoiceCardActive]}
              onPress={() => handleSelectFormat('standard')}
            >
              <View style={styles.formatChoiceTop}>
                <Ionicons
                  name="color-palette"
                  size={18}
                  color={invoiceFormat === 'standard' ? COLORS.primary : COLORS.textMuted}
                />
                {invoiceFormat === 'standard' && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.formatChoiceTitle}>Standard Modern</Text>
              <Text style={styles.formatChoiceDesc}>
                Vibrant styling with colored badges, cards, and glassmorphism.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatChoiceCard, invoiceFormat === 'basic_tax' && styles.formatChoiceCardActive]}
              onPress={() => handleSelectFormat('basic_tax')}
            >
              <View style={styles.formatChoiceTop}>
                <Ionicons
                  name="document-text"
                  size={18}
                  color={invoiceFormat === 'basic_tax' ? COLORS.primary : COLORS.textMuted}
                />
                {invoiceFormat === 'basic_tax' && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.formatChoiceTitle}>Basic Tax Invoice</Text>
              <Text style={styles.formatChoiceDesc}>
                Clean, formal black & white A4 GST layout with classic borders and HSN table.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Profile Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Business Profile (for Invoice PDF)</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business / Enterprise Name</Text>
            <TextInput
              style={styles.input}
              value={settings.businessName}
              onChangeText={(val) => setSettings({ ...settings, businessName: val })}
              placeholder="My Enterprise"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Phone</Text>
            <TextInput
              style={styles.input}
              value={settings.businessPhone}
              onChangeText={(val) => setSettings({ ...settings, businessPhone: val })}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Address</Text>
            <TextInput
              style={styles.input}
              value={settings.businessAddress}
              onChangeText={(val) => setSettings({ ...settings, businessAddress: val })}
              placeholder="123 Market Street, Main City"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
            <TextInput
              style={styles.input}
              value={settings.gstin}
              onChangeText={(val) => setSettings({ ...settings, gstin: val })}
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>
        </View>

        {/* Bank Details Section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="card-outline" size={18} color={COLORS.success} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Business Bank Details</Text>
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 16 }}>
            Printed on tax invoices so clients can transfer payments via NEFT, RTGS, or IMPS.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.bankName}
              onChangeText={(val) => setBankDetails({ ...bankDetails, bankName: val })}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.accountHolder}
              onChangeText={(val) => setBankDetails({ ...bankDetails, accountHolder: val })}
              placeholder="e.g. My Enterprise Pvt Ltd"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.accountNumber}
              onChangeText={(val) => setBankDetails({ ...bankDetails, accountNumber: val })}
              placeholder="e.g. 50200012345678"
              keyboardType="number-pad"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.ifsc}
              onChangeText={(val) => setBankDetails({ ...bankDetails, ifsc: val.toUpperCase() })}
              placeholder="e.g. HDFC0001234"
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch Name & City</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.branch}
              onChangeText={(val) => setBankDetails({ ...bankDetails, branch: val })}
              placeholder="e.g. Industrial Area Branch"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Save All Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Currency Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Default Currency</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyBtn,
                  settings.currency === c.code && styles.currencyBtnActive,
                ]}
                onPress={() => handleSelectCurrency(c.code, c.symbol)}
              >
                <Text
                  style={[
                    styles.currencyText,
                    settings.currency === c.code && styles.currencyTextActive,
                  ]}
                >
                  {c.symbol} {c.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voice-to-Data Templates Section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="grid" size={20} color={COLORS.dataColor} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Data-Entry Templates</Text>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 14, lineHeight: 18 }}>
            Create custom voice data-entry schemas, manage fields, extraction names, and repeated entry tables.
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: COLORS.dataColor }]}
            onPress={() => router.push('/modal/template-manager')}
          >
            <Ionicons name="layers-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Manage Data Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Export & Import Backup System */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Backup & Restore</Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 14, lineHeight: 18 }}>
            Export your transaction and receipt history to JSON or CSV format, or restore from a previously exported backup file.
          </Text>

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => handleExportHistory('json')}
              disabled={isExporting}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: COLORS.secondary }]}
              onPress={() => handleExportHistory('csv')}
              disabled={isExporting}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, marginTop: 10 }]}
            onPress={handleImportHistory}
            disabled={isImporting}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={COLORS.text} style={{ marginRight: 6 }} />
            <Text style={[styles.saveBtnText, { color: COLORS.text }]}>
              {isImporting ? 'Importing...' : 'Restore from Backup (JSON / CSV)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Data & Reset */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Database Management</Text>

          <TouchableOpacity style={styles.demoBtn} onPress={handleLoadDemoData}>
            <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.demoBtnText}>Load Sample Demo Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={{ marginRight: 6 }} />
            <Text style={styles.clearBtnText}>Clear All Database Records</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Invoice Format Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Format Preview</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Toggle Tabs */}
            <View style={styles.modalTabs}>
              <TouchableOpacity
                style={[styles.modalTabBtn, previewTab === 'standard' && styles.modalTabBtnActive]}
                onPress={() => setPreviewTab('standard')}
              >
                <Text style={[styles.modalTabBtnText, previewTab === 'standard' && styles.modalTabBtnTextActive]}>
                  Standard Modern
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, previewTab === 'basic_tax' && styles.modalTabBtnActive]}
                onPress={() => setPreviewTab('basic_tax')}
              >
                <Text style={[styles.modalTabBtnText, previewTab === 'basic_tax' && styles.modalTabBtnTextActive]}>
                  Basic Tax (A4 B&W)
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {previewTab === 'standard' ? (
                <View style={styles.previewContainerStandard}>
                  <View style={styles.previewStandardHeader}>
                    <Text style={styles.previewCompanyName}>{settings.businessName || 'My Enterprise'}</Text>
                    <Text style={styles.previewSubText}>{settings.businessAddress || '123 Market St'}</Text>
                    <Text style={styles.previewSubText}>GSTIN: {settings.gstin || '22AAAAA0000A1Z5'}</Text>
                  </View>

                  <View style={styles.previewBadgeRow}>
                    <Text style={styles.previewBadge}>TAX INVOICE</Text>
                    <Text style={styles.previewInvNo}>INV-2026-0042</Text>
                  </View>

                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>Bill To:</Text>
                    <Text style={styles.previewVal}>Sharma Enterprise & Traders</Text>
                    <Text style={styles.previewSubText}>GSTIN: 29ABCDE1234F1Z5</Text>
                  </View>

                  <View style={styles.previewTable}>
                    <View style={styles.previewTableHeader}>
                      <Text style={[styles.previewTh, { flex: 2 }]}>Item</Text>
                      <Text style={[styles.previewTh, { flex: 1 }]}>HSN</Text>
                      <Text style={[styles.previewTh, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                    </View>
                    <View style={styles.previewTableRow}>
                      <Text style={[styles.previewTd, { flex: 2 }]}>Basmati Rice</Text>
                      <Text style={[styles.previewTd, { flex: 1 }]}>1006</Text>
                      <Text style={[styles.previewTd, { flex: 1, textAlign: 'right' }]}>₹6,000</Text>
                    </View>
                    <View style={styles.previewTableRow}>
                      <Text style={[styles.previewTd, { flex: 2 }]}>Cooking Oil</Text>
                      <Text style={[styles.previewTd, { flex: 1 }]}>1512</Text>
                      <Text style={[styles.previewTd, { flex: 1, textAlign: 'right' }]}>₹1,400</Text>
                    </View>
                  </View>

                  <View style={styles.previewTotalBox}>
                    <Text style={styles.previewTotalLabel}>Grand Total (with 18% GST)</Text>
                    <Text style={styles.previewTotalVal}>₹8,732.00</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.previewContainerBw}>
                  <View style={styles.previewBwHeader}>
                    <Text style={styles.previewBwBanner}>GST TAX INVOICE • ORIGINAL FOR RECIPIENT</Text>
                    <Text style={styles.previewBwCompanyName}>{settings.businessName || 'MY ENTERPRISE'}</Text>
                    <Text style={styles.previewBwSub}>{settings.businessAddress}</Text>
                    <Text style={styles.previewBwSub}>GSTIN: {settings.gstin} | Ph: {settings.businessPhone}</Text>
                  </View>

                  <View style={styles.previewBwGrid}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.previewBwLabel}>BUYER (BILL TO):</Text>
                      <Text style={styles.previewBwVal}>Sharma Enterprise</Text>
                      <Text style={styles.previewBwSub}>GSTIN: 29ABCDE1234F1Z5</Text>
                    </View>
                    <View style={{ flex: 1, borderLeftWidth: 1, paddingLeft: 8 }}>
                      <Text style={styles.previewBwSub}>Invoice No: INV-2026-0042</Text>
                      <Text style={styles.previewBwSub}>Date: 20 Aug 2026</Text>
                    </View>
                  </View>

                  <View style={styles.previewBwTable}>
                    <View style={styles.previewBwThRow}>
                      <Text style={[styles.previewBwTh, { flex: 2 }]}>Description</Text>
                      <Text style={[styles.previewBwTh, { flex: 1 }]}>HSN</Text>
                      <Text style={[styles.previewBwTh, { flex: 1, textAlign: 'right' }]}>Total</Text>
                    </View>
                    <View style={styles.previewBwTr}>
                      <Text style={[styles.previewBwTd, { flex: 2 }]}>Basmati Rice</Text>
                      <Text style={[styles.previewBwTd, { flex: 1 }]}>1006</Text>
                      <Text style={[styles.previewBwTd, { flex: 1, textAlign: 'right' }]}>₹6,000</Text>
                    </View>
                  </View>

                  <View style={styles.previewBwFooter}>
                    <Text style={styles.previewBwSub}>Total in Words: Six Thousand Rupees Only</Text>
                    <Text style={styles.previewBwTotal}>TOTAL: ₹6,000.00</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalApplyBtn}
              onPress={async () => {
                await handleSelectFormat(previewTab);
                setShowPreviewModal(false);
              }}
            >
              <Text style={styles.modalApplyBtnText}>Use {previewTab === 'basic_tax' ? 'Basic Tax (A4 B&W)' : 'Standard Modern'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewBtnText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  formatChoiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatChoiceCard: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  formatChoiceCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  formatChoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formatChoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  formatChoiceDesc: {
    fontSize: 11,
    color: COLORS.textSubtle,
    lineHeight: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  currencyBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  currencyTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  demoBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    maxHeight: '85%',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalTabBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 350,
  },
  previewContainerStandard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  previewStandardHeader: {
    marginBottom: 8,
  },
  previewCompanyName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  previewSubText: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewInvNo: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.text,
    fontWeight: '700',
  },
  previewBox: {
    backgroundColor: COLORS.card,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 9,
    color: COLORS.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewTable: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 6,
  },
  previewTh: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
  },
  previewTableRow: {
    flexDirection: 'row',
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  previewTd: {
    fontSize: 11,
    color: COLORS.text,
  },
  previewTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: COLORS.card,
    borderRadius: 6,
  },
  previewTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewTotalVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  previewContainerBw: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 10,
  },
  previewBwHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 6,
    alignItems: 'center',
  },
  previewBwBanner: {
    fontSize: 8,
    fontWeight: '800',
    color: '#444444',
  },
  previewBwCompanyName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  previewBwSub: {
    fontSize: 9,
    color: '#222222',
  },
  previewBwGrid: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingVertical: 6,
  },
  previewBwLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#444444',
  },
  previewBwVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  previewBwTable: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  previewBwThRow: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  previewBwTh: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  previewBwTr: {
    flexDirection: 'row',
    padding: 4,
  },
  previewBwTd: {
    fontSize: 9,
    color: '#000000',
  },
  previewBwFooter: {
    paddingTop: 6,
  },
  previewBwTotal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    marginTop: 4,
    textAlign: 'right',
  },
  modalApplyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
