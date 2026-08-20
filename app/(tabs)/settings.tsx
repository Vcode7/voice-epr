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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, COLORS } from '../../src/constants';
import {
  settingsRepository,
  transactionRepository,
  receiptRepository,
  budgetRepository,
  debtRepository,
  dataEntryRepository,
} from '../../src/repositories';
import { UserSettings } from '../../src/types';
import { GroqService } from '../../src/services/groq/groqService';
import { seedDemoData } from '../../src/utils/sampleDataGenerator';
import { ExportImportService } from '../../src/services/exportImportService';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>({
    currency: 'INR',
    currencySymbol: '₹',
    businessName: '',
    businessPhone: '',
    businessAddress: '',
    gstin: '',
    receiptPrefix: 'INV-',
    customGroqApiKey: '',
  });
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
      customGroqApiKey: apiKeyInput.trim(),
    });
    setSettings(updated);
    const status = await GroqService.getKeyStatus();
    setKeyStatus(status);
    Alert.alert('Settings Saved', 'Your preferences and Groq API keys have been updated.');
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
        <Text style={styles.title}>Settings & Configuration</Text>
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

        {/* Currency Selection */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Default Currency</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.currencyChip,
                  settings.currency === c.code && styles.currencyChipActive,
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

        {/* Business Invoice Details */}
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
              placeholder="Address line"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
            <TextInput
              style={styles.input}
              value={settings.gstin}
              onChangeText={(val) => setSettings({ ...settings, gstin: val })}
              placeholder="GSTIN"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Save Preferences</Text>
          </TouchableOpacity>
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
              style={styles.exportBtn}
              onPress={() => handleExportHistory('csv')}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.importBtn}
            onPress={handleImportHistory}
            disabled={isImporting}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.importBtnText}>Import History (JSON / CSV)</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Data & Development Options */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Demo & Data Management</Text>

          <TouchableOpacity style={styles.demoBtn} onPress={handleLoadDemoData}>
            <Ionicons name="flask-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.demoBtnText}>Load Sample Demo Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
            <Text style={styles.clearBtnText}>Wipe All Stored Data</Text>
          </TouchableOpacity>
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
  },
  scrollContent: {
    padding: 20,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  currencyChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  currencyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  currencyTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
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
    fontWeight: '700',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  demoBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 14,
    borderRadius: 12,
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  importBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
