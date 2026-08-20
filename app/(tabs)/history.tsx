import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCard } from '../../src/components/transaction/TransactionCard';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useDataEntries } from '../../src/hooks/useDataEntries';
import { useTemplates } from '../../src/hooks/useTemplates';
import { Transaction, TransactionType, DataEntryRecord } from '../../src/types';
import { DEFAULT_CATEGORIES, PAYMENT_METHOD_CATEGORIES, COLORS } from '../../src/constants';
import { formatDateDisplay, getTodayString, getYesterdayString, isThisWeek } from '../../src/utils/dateUtils';
import { formatCurrency } from '../../src/utils/currencyFormatter';
import { transactionRepository } from '../../src/repositories';
import { PdfGeneratorService } from '../../src/services/pdf/pdfService';

export default function HistoryScreen() {
  const [historyMode, setHistoryMode] = useState<'transactions' | 'data'>('transactions');

  // Transactions State
  const { transactions, refreshTransactions, deleteTransaction } = useTransactions();
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Edit Mode State for Transactions
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMerchant, setEditMerchant] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  // Data Entries State
  const { dataEntries, refreshDataEntries, deleteDataEntry } = useDataEntries();
  const { templates, refreshTemplates } = useTemplates();
  const [dataSearch, setDataSearch] = useState<string>('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('All');

  useFocusEffect(
    React.useCallback(() => {
      refreshTransactions();
      refreshDataEntries();
      refreshTemplates();
    }, [refreshTransactions, refreshDataEntries, refreshTemplates])
  );

  const openTxDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsEditing(false);
    setEditAmount(tx.amount.toString());
    setEditMerchant(tx.merchant || '');
    setEditCategory(tx.category || 'Other');
    setEditPaymentMethod(tx.paymentMethod || '');
    setEditType(tx.transactionType || 'expense');
    setEditDescription(tx.description || '');
    setEditDate(tx.date || getTodayString());
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || (t.category || '').toLowerCase() === selectedCategory.toLowerCase();

    const matchesType =
      selectedType === 'All' || t.transactionType === selectedType.toLowerCase();

    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredDataEntries = dataEntries.filter((e) => {
    if (selectedTemplateFilter === 'flexible') {
      if (!e.isFlexible && e.templateId !== 'flexible' && !e.flexibleFields) return false;
    } else if (selectedTemplateFilter !== 'All') {
      const matches = e.templateId === selectedTemplateFilter || e.templateName === selectedTemplateFilter;
      if (!matches) return false;
    }

    if (!dataSearch.trim()) return true;

    const query = dataSearch.toLowerCase();
    const matchesName = (e.title || e.templateName || '').toLowerCase().includes(query);
    const matchesTranscript = (e.rawTranscript || '').toLowerCase().includes(query);
    const matchesDate = e.date.toLowerCase().includes(query);
    const matchesFieldValues = Object.values(e.fieldValues || {}).some((v) =>
      String(v).toLowerCase().includes(query)
    );
    const matchesFlexFields = (e.flexibleFields || []).some(
      (f) => f.name.toLowerCase().includes(query) || String(f.value).toLowerCase().includes(query)
    );

    return matchesName || matchesTranscript || matchesDate || matchesFieldValues || matchesFlexFields;
  });

  // Grouping by Today, Yesterday, This Week, Earlier for transactions
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const txGroups: { title: string; items: Transaction[] }[] = [
    { title: 'Today', items: filteredTransactions.filter((t) => t.date === today) },
    { title: 'Yesterday', items: filteredTransactions.filter((t) => t.date === yesterday) },
    { title: 'This Week', items: filteredTransactions.filter((t) => t.date !== today && t.date !== yesterday && isThisWeek(t.date)) },
    { title: 'Earlier', items: filteredTransactions.filter((t) => t.date !== today && t.date !== yesterday && !isThisWeek(t.date)) },
  ].filter((g) => g.items.length > 0);

  const dataGroups: { title: string; items: DataEntryRecord[] }[] = [
    { title: 'Today', items: filteredDataEntries.filter((e) => e.date === today) },
    { title: 'Yesterday', items: filteredDataEntries.filter((e) => e.date === yesterday) },
    { title: 'This Week', items: filteredDataEntries.filter((e) => e.date !== today && e.date !== yesterday && isThisWeek(e.date)) },
    { title: 'Earlier', items: filteredDataEntries.filter((e) => e.date !== today && e.date !== yesterday && !isThisWeek(e.date)) },
  ].filter((g) => g.items.length > 0);

  const handleDeleteSelectedTx = async () => {
    if (!selectedTx) return;
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(selectedTx.id);
          setSelectedTx(null);
        },
      },
    ]);
  };

  const handleSaveEditTx = async () => {
    if (!selectedTx) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      const updated = await transactionRepository.updateTransaction(selectedTx.id, {
        amount: parsedAmount,
        merchant: editMerchant.trim() || null,
        category: editCategory || 'Other',
        paymentMethod: editPaymentMethod.trim() || null,
        transactionType: editType,
        description: editDescription.trim() || null,
        date: editDate.trim() || selectedTx.date,
      });

      if (updated) {
        setSelectedTx(updated);
        setIsEditing(false);
        await refreshTransactions();
      }
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Failed to update transaction.');
    }
  };

  const handleShareDataEntryPdf = async (record: DataEntryRecord) => {
    try {
      let tmpl: any = templates.find((t) => t.id === record.templateId);
      if (!tmpl || record.isFlexible) {
        tmpl = {
          id: 'flexible',
          name: record.title || record.templateName || 'Flexible Report',
          fields: (record.flexibleFields || []).map((f, i) => ({
            id: `f_${i}`,
            name: f.name,
            extractionKey: f.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            type: 'text',
          })),
          hasTable: !!(record.tableHeaders && record.tableHeaders.length > 0),
          tableTitle: record.tableTitle,
          tableFields: (record.tableHeaders || []).map((h, i) => ({
            id: `col_${i}`,
            name: h,
            extractionKey: h.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            type: 'text',
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      await PdfGeneratorService.shareDataEntryPdf(record, tmpl);
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message || 'Could not export PDF.');
    }
  };


  const handleDeleteDataEntry = (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this Voice-to-Data record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDataEntry(id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History & Records</Text>
        <TouchableOpacity
          style={styles.newRecordBtn}
          onPress={() => router.push('/')}
        >
          <Ionicons name="mic" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newRecordBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      {/* Main Segmented Mode Switcher */}
      <View style={styles.historySegmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, historyMode === 'transactions' && styles.segmentBtnActiveTx]}
          onPress={() => setHistoryMode('transactions')}
        >
          <Ionicons
            name="wallet"
            size={16}
            color={historyMode === 'transactions' ? '#FFFFFF' : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.segmentBtnText, historyMode === 'transactions' && styles.segmentBtnTextActive]}
          >
            Transactions ({transactions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, historyMode === 'data' && styles.segmentBtnActiveData]}
          onPress={() => setHistoryMode('data')}
        >
          <Ionicons
            name="grid"
            size={16}
            color={historyMode === 'data' ? '#FFFFFF' : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.segmentBtnText, historyMode === 'data' && styles.segmentBtnTextActive]}
          >
            Voice-to-Data ({dataEntries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {historyMode === 'data' ? (
        /* ================= VOICE-TO-DATA RECORDS VIEW ================= */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Part No, Batch, Shift, or notes..."
              placeholderTextColor={COLORS.textSubtle}
              value={dataSearch}
              onChangeText={setDataSearch}
            />
            {dataSearch.length > 0 && (
              <TouchableOpacity onPress={() => setDataSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Template Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedTemplateFilter === 'All' && styles.filterChipActiveData]}
              onPress={() => setSelectedTemplateFilter('All')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTemplateFilter === 'All' && styles.filterChipTextActive,
                ]}
              >
                All Records
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedTemplateFilter === 'flexible' && styles.filterChipActiveData]}
              onPress={() => setSelectedTemplateFilter('flexible')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTemplateFilter === 'flexible' && styles.filterChipTextActive,
                ]}
              >
                ✨ Flexible
              </Text>
            </TouchableOpacity>

            {templates.map((tmpl) => {
              const isSel = selectedTemplateFilter === tmpl.id || selectedTemplateFilter === tmpl.name;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  style={[styles.filterChip, isSel && styles.filterChipActiveData]}
                  onPress={() => setSelectedTemplateFilter(tmpl.id)}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                    {tmpl.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grouped Data Entries */}
          {filteredDataEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="grid-outline" size={44} color={COLORS.textSubtle} />
              <Text style={styles.emptyTitle}>No data records found</Text>
              <Text style={styles.emptySub}>
                Switch to Voice-to-Data on Home screen to dictate structured entries.
              </Text>
            </View>
          ) : (
            dataGroups.map((group) => (
              <View key={group.title} style={styles.groupContainer}>
                <Text style={styles.groupHeader}>{group.title}</Text>
                {group.items.map((entry) => {
                  const isFlex = entry.isFlexible || entry.templateId === 'flexible' || !!entry.flexibleFields;
                  const rowCount = entry.tableRows?.length || 0;

                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.dataEntryCard}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: '/modal/data-entry-edit',
                          params: { entryId: entry.id, templateId: entry.templateId },
                        })
                      }
                    >
                      <View style={styles.dataCardHeader}>
                        <View style={styles.dataCardTitleRow}>
                          <View style={styles.dataIconBadge}>
                            <Ionicons
                              name={isFlex ? 'sparkles' : 'grid'}
                              size={14}
                              color={COLORS.dataColor}
                            />
                          </View>
                          <Text style={styles.dataCardTemplateName}>
                            {isFlex ? entry.title || 'Flexible Entry' : entry.templateName}
                          </Text>
                          {isFlex && (
                            <View style={styles.flexPill}>
                              <Text style={styles.flexPillText}>Auto</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.dataCardDateText}>{formatDateDisplay(entry.date)}</Text>
                      </View>

                      {/* Key Field Badges */}
                      <View style={styles.dataCardPillsRow}>
                        {isFlex && entry.flexibleFields && entry.flexibleFields.length > 0 ? (
                          entry.flexibleFields.slice(0, 4).map((f, fIdx) => (
                            <View key={`flx_hist_${fIdx}`} style={styles.metricPill}>
                              <Text style={styles.metricPillLabel}>{f.name}:</Text>
                              <Text style={styles.metricPillVal} numberOfLines={1}>
                                {String(f.value)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <>
                            {entry.fieldValues['part_no'] || entry.fieldValues['item_name'] ? (
                              <View style={styles.metricPill}>
                                <Text style={styles.metricPillLabel}>Part:</Text>
                                <Text style={styles.metricPillVal}>
                                  {entry.fieldValues['part_no'] || entry.fieldValues['item_name']}
                                </Text>
                              </View>
                            ) : null}
                            {entry.fieldValues['shift'] ? (
                              <View style={styles.metricPill}>
                                <Text style={styles.metricPillLabel}>Shift:</Text>
                                <Text style={styles.metricPillVal}>{entry.fieldValues['shift']}</Text>
                              </View>
                            ) : null}
                            {entry.fieldValues['batch_no'] ? (
                              <View style={styles.metricPill}>
                                <Text style={styles.metricPillLabel}>Batch:</Text>
                                <Text style={styles.metricPillVal}>{entry.fieldValues['batch_no']}</Text>
                              </View>
                            ) : null}
                          </>
                        )}

                        {rowCount > 0 ? (
                          <View style={[styles.metricPill, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                            <Ionicons name="list" size={11} color={COLORS.dataColor} style={{ marginRight: 3 }} />
                            <Text style={[styles.metricPillVal, { color: COLORS.dataColor }]}>
                              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {entry.rawTranscript ? (
                        <Text style={styles.dataCardTranscript} numberOfLines={2}>
                          "{entry.rawTranscript}"
                        </Text>
                      ) : null}


                      {/* Card Action Footer */}
                      <View style={styles.dataCardFooter}>
                        <TouchableOpacity
                          style={styles.dataCardActionBtn}
                          onPress={() => handleShareDataEntryPdf(entry)}
                        >
                          <Ionicons name="share-outline" size={15} color={COLORS.dataColor} style={{ marginRight: 4 }} />
                          <Text style={styles.dataCardActionText}>Export PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.dataCardActionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                          onPress={() => handleDeleteDataEntry(entry.id)}
                        >
                          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* ================= FINANCIAL TRANSACTIONS VIEW ================= */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by merchant, category, or note..."
              placeholderTextColor={COLORS.textSubtle}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Type Filter */}
          <View style={styles.typeFilterRow}>
            {['All', 'Expense', 'Income', 'Transfer'].map((type) => {
              const isSelected = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, isSelected && styles.typeChipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['All', ...DEFAULT_CATEGORIES].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grouped Transactions */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="file-tray-outline" size={44} color={COLORS.textSubtle} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search terms or filters above.
              </Text>
            </View>
          ) : (
            txGroups.map((group) => (
              <View key={group.title} style={styles.groupContainer}>
                <Text style={styles.groupHeader}>{group.title}</Text>
                {group.items.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} onPress={() => openTxDetail(tx)} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Transaction Detail / Edit Modal */}
      {selectedTx && (
        <Modal visible={!!selectedTx} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Transaction' : 'Transaction Details'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedTx(null)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {isEditing ? (
                  <View style={styles.editForm}>
                    <View style={styles.typeToggleRow}>
                      {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.typeBtn, editType === t && styles.typeActive]}
                          onPress={() => setEditType(t)}
                        >
                          <Text style={[styles.typeText, editType === t && styles.typeTextActive]}>
                            {t.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Amount (₹)</Text>
                      <TextInput
                        style={styles.input}
                        value={editAmount}
                        onChangeText={setEditAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Merchant / Payee</Text>
                      <TextInput
                        style={styles.input}
                        value={editMerchant}
                        onChangeText={setEditMerchant}
                        placeholder="e.g. Amazon, Grocery"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Category</Text>
                      <TextInput
                        style={styles.input}
                        value={editCategory}
                        onChangeText={setEditCategory}
                        placeholder="e.g. Groceries"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Payment Method</Text>
                      <TextInput
                        style={styles.input}
                        value={editPaymentMethod}
                        onChangeText={setEditPaymentMethod}
                        placeholder="e.g. UPI, Credit Card"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Description</Text>
                      <TextInput
                        style={styles.input}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        placeholder="e.g. Monthly subscription"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <TextInput
                        style={styles.input}
                        value={editDate}
                        onChangeText={setEditDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailView}>
                    <View style={styles.detailAmountRow}>
                      <Text
                        style={[
                          styles.detailAmount,
                          selectedTx.transactionType === 'income'
                            ? { color: COLORS.incomeColor }
                            : { color: COLORS.expenseColor },
                        ]}
                      >
                        {selectedTx.transactionType === 'income' ? '+' : '-'}
                        {formatCurrency(selectedTx.amount, '₹')}
                      </Text>
                      <View style={styles.detailTypeBadge}>
                        <Text style={styles.detailTypeBadgeText}>
                          {selectedTx.transactionType.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Merchant / Payee</Text>
                      <Text style={styles.detailValue}>{selectedTx.merchant || 'None specified'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{selectedTx.category || 'Other'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{selectedTx.paymentMethod || 'Not specified'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDateDisplay(selectedTx.date)}</Text>
                    </View>

                    {selectedTx.description ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>{selectedTx.description}</Text>
                      </View>
                    ) : null}

                    {selectedTx.transcript ? (
                      <View style={styles.transcriptBox}>
                        <Text style={styles.transcriptLabel}>Spoken Transcript</Text>
                        <Text style={styles.transcriptContent}>"{selectedTx.transcript}"</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                {isEditing ? (
                  <>
                    <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setIsEditing(false)}>
                      <Text style={styles.cancelEditText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEditTx}>
                      <Text style={styles.saveEditText}>Save Changes</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.deleteModalBtn} onPress={handleDeleteSelectedTx}>
                      <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.deleteModalText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editModalBtn} onPress={() => setIsEditing(true)}>
                      <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.editModalText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                )}
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
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  newRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  newRecordBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  historySegmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActiveTx: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnActiveData: {
    backgroundColor: COLORS.dataColor,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  typeFilterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  typeChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipActiveData: {
    backgroundColor: COLORS.dataColor,
    borderColor: COLORS.dataColor,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dataEntryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dataCardTemplateName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  flexPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  flexPillText: {
    color: COLORS.dataColor,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dataCardDateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  dataCardPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricPillLabel: {
    fontSize: 10,
    color: COLORS.textSubtle,
    marginRight: 3,
  },
  metricPillVal: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  dataCardTranscript: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  dataCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
    marginTop: 4,
  },
  dataCardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dataCardActionText: {
    color: COLORS.dataColor,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  detailView: {
    marginBottom: 16,
  },
  detailAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: '900',
  },
  detailTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  detailItem: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  transcriptBox: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcriptContent: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  editModalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteModalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editForm: {
    marginBottom: 10,
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeActive: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  cancelEditText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveEditText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
