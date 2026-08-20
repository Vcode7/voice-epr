import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MicrophoneButton } from '../../src/components/voice/MicrophoneButton';
import { RecordingOverlay } from '../../src/components/voice/RecordingOverlay';
import { TransactionCard } from '../../src/components/transaction/TransactionCard';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useTemplates } from '../../src/hooks/useTemplates';
import { useDataEntries } from '../../src/hooks/useDataEntries';
import { GroqService } from '../../src/services/groq/groqService';
import { COLORS } from '../../src/constants';
import { formatDateDisplay } from '../../src/utils/dateUtils';

export default function HomeScreen() {
  const [mode, setMode] = useState<'expense' | 'receipt' | 'data'>('expense');
  const [voiceDataMode, setVoiceDataMode] = useState<'flexible' | 'template'>('flexible');
  const [refreshing, setRefreshing] = useState(false);
  const recorder = useAudioRecorder();
  const { transactions, refreshTransactions } = useTransactions();
  const { templates, activeTemplate, activeTemplateId, selectActiveTemplate, refreshTemplates } = useTemplates();
  const { dataEntries, refreshDataEntries } = useDataEntries();

  useFocusEffect(
    React.useCallback(() => {
      refreshTransactions();
      refreshTemplates();
      refreshDataEntries();
    }, [refreshTransactions, refreshTemplates, refreshDataEntries])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshTransactions(), refreshTemplates(), refreshDataEntries()]);
    setRefreshing(false);
  };

  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const uri = await recorder.stopRecording();
      if (!uri) return;

      try {
        if (mode === 'expense') {
          recorder.setState('Transcribing');
          const transcript = await GroqService.transcribeAudio(uri);

          recorder.setState('Understanding');
          const extracted = await GroqService.extractFinancialIntent(transcript);

          recorder.resetRecorder();
          router.push({
            pathname: '/modal/confirmation',
            params: { extractedJson: JSON.stringify(extracted) },
          });
        } else if (mode === 'receipt') {
          // Receipt mode
          recorder.setState('Transcribing');
          const transcript = await GroqService.transcribeAudio(uri);

          recorder.setState('Understanding');
          const extractedReceipt = await GroqService.extractVoiceReceipt(transcript);

          recorder.resetRecorder();
          router.push({
            pathname: '/modal/receipt-edit',
            params: { extractedJson: JSON.stringify(extractedReceipt) },
          });
        } else {
          // Voice-to-Data mode
          recorder.setState('Transcribing');
          const transcript = await GroqService.transcribeAudio(uri);

          recorder.setState('Understanding');
          if (voiceDataMode === 'flexible') {
            const flexibleResult = await GroqService.extractFlexibleData(transcript);
            recorder.resetRecorder();
            router.push({
              pathname: '/modal/data-entry-edit',
              params: {
                flexibleJson: JSON.stringify(flexibleResult),
                isFlexible: 'true',
              },
            });
          } else {
            const extractedData = await GroqService.extractCustomData(transcript, activeTemplate);
            recorder.resetRecorder();
            router.push({
              pathname: '/modal/data-entry-edit',
              params: {
                extractedJson: JSON.stringify(extractedData),
                templateId: activeTemplate.id,
              },
            });
          }
        }
      } catch (err: any) {
        console.error('[Voice Processing Error]', err);
        recorder.setErrorMessage(err?.message || 'Processing failed. Please try again.');
        recorder.setState('Error');
      }
    } else {
      await recorder.startRecording();
    }
  };

  const recentTransactions = transactions.slice(0, 5);
  const recentDataEntries = dataEntries.slice(0, 5);

  const getMicTemplateLabel = () => {
    if (mode !== 'data') return undefined;
    return voiceDataMode === 'flexible' ? '✨ Flexible (Auto-Detect)' : activeTemplate.name;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Voice EPR</Text>
            <Text style={styles.appSubtitle}>Speak naturally. Extract structured data.</Text>
          </View>

          <TouchableOpacity
            style={styles.queryHeaderBtn}
            onPress={() => router.push('/modal/query-modal')}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.queryHeaderText}>Ask AI</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Toggles */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.modeBtn, mode === 'expense' && styles.modeBtnActiveExpense]}
            onPress={() => setMode('expense')}
          >
            <Ionicons
              name="wallet"
              size={16}
              color={mode === 'expense' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeText, mode === 'expense' && styles.modeTextActive]}>
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.modeBtn, mode === 'receipt' && styles.modeBtnActiveReceipt]}
            onPress={() => setMode('receipt')}
          >
            <Ionicons
              name="receipt"
              size={16}
              color={mode === 'receipt' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeText, mode === 'receipt' && styles.modeTextActive]}>
              Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.modeBtn, mode === 'data' && styles.modeBtnActiveData]}
            onPress={() => setMode('data')}
          >
            <Ionicons
              name="grid"
              size={16}
              color={mode === 'data' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeText, mode === 'data' && styles.modeTextActive]}>
              Voice-to-Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voice-to-Data Configuration Card */}
        {mode === 'data' && (
          <View style={styles.templatePickerCard}>
            {/* Sub-mode Segment (Flexible vs Template) */}
            <View style={styles.voiceDataSubToggleRow}>
              <TouchableOpacity
                style={[
                  styles.voiceDataSubBtn,
                  voiceDataMode === 'flexible' && styles.voiceDataSubBtnActive,
                ]}
                onPress={() => setVoiceDataMode('flexible')}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={voiceDataMode === 'flexible' ? '#FFFFFF' : COLORS.dataColor}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.voiceDataSubText,
                    voiceDataMode === 'flexible' && styles.voiceDataSubTextActive,
                  ]}
                >
                  Flexible Extraction
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voiceDataSubBtn,
                  voiceDataMode === 'template' && styles.voiceDataSubBtnActive,
                ]}
                onPress={() => setVoiceDataMode('template')}
              >
                <Ionicons
                  name="layers"
                  size={14}
                  color={voiceDataMode === 'template' ? '#FFFFFF' : COLORS.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.voiceDataSubText,
                    voiceDataMode === 'template' && styles.voiceDataSubTextActive,
                  ]}
                >
                  Template Mode
                </Text>
              </TouchableOpacity>
            </View>

            {voiceDataMode === 'flexible' ? (
              /* Flexible Mode Info */
              <View style={styles.flexibleInfoBox}>
                <View style={styles.flexibleHeaderRow}>
                  <Ionicons name="sparkles" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                  <Text style={styles.flexibleTitle}>No Predefined Schema Required</Text>
                </View>
                <Text style={styles.flexibleDesc}>
                  Speak your information naturally (e.g. "Part no 1234, date 20 August, billing none, operator Ravi"). The AI will auto-discover field names, values, and repeated table structures.
                </Text>

                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/modal/data-entry-edit',
                      params: { isFlexible: 'true' },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.manualEntryText}>Manual Form Entry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Template Mode Picker */
              <View>
                <View style={styles.templateCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.templateHeaderRow}>
                      <Ionicons name="layers" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                      <Text style={styles.activeTemplateTitle}>Template: {activeTemplate.name}</Text>
                      {activeTemplate.isDefault && (
                        <View style={styles.templatePill}>
                          <Text style={styles.templatePillText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.templateSub}>
                      {activeTemplate.fields.length} Fields
                      {activeTemplate.hasTable ? ` • Table (${activeTemplate.tableFields?.length || 0} Cols)` : ''}
                    </Text>
                  </View>

                  <View style={styles.templateActionButtons}>
                    <TouchableOpacity
                      style={styles.manageTemplatesBtn}
                      onPress={() => router.push('/modal/template-manager')}
                    >
                      <Ionicons name="options-outline" size={15} color={COLORS.dataColor} style={{ marginRight: 4 }} />
                      <Text style={styles.manageTemplatesText}>Manage</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.newTemplateBtn}
                      onPress={() => router.push('/modal/template-edit')}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Template Switcher Chips */}
                {templates.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.templateChipsScroll}
                    contentContainerStyle={{ paddingVertical: 4 }}
                  >
                    {templates.map((tmpl) => {
                      const isSel = tmpl.id === activeTemplateId;
                      return (
                        <TouchableOpacity
                          key={tmpl.id}
                          style={[styles.tmplChip, isSel && styles.tmplChipActive]}
                          onPress={() => selectActiveTemplate(tmpl.id)}
                        >
                          <Text style={[styles.tmplChipText, isSel && styles.tmplChipTextActive]}>
                            {tmpl.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Manual Entry Button */}
                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/modal/data-entry-edit',
                      params: { templateId: activeTemplate.id },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.manualEntryText}>Manual Form Entry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Greeting Banner (for Expense and Receipt modes) */}
        {mode !== 'data' && (
          <View style={styles.greetingCard}>
            <Text style={styles.greetingTitle}>
              {mode === 'receipt' ? 'Create a Voice Receipt' : 'Record an Expense or Income'}
            </Text>
            <Text style={styles.greetingSub}>
              {mode === 'receipt'
                ? 'Speak line items e.g., "5 kg Sugar at 40 per kg, 2 litres Milk at 60"'
                : 'Tap microphone and speak e.g. "Paid 450 rupees for groceries"'}
            </Text>
          </View>
        )}

        {/* Microphone Pulse Button */}
        <MicrophoneButton
          state={recorder.state}
          onPress={handleMicPress}
          mode={mode}
          templateName={getMicTemplateLabel()}
        />

        {/* Recent Feed Section */}
        {mode === 'data' ? (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Voice-to-Data Records</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <Text style={[styles.seeAllText, { color: COLORS.dataColor }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentDataEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="grid-outline" size={40} color={COLORS.textSubtle} />
                <Text style={styles.emptyTitle}>No data records yet</Text>
                <Text style={styles.emptySub}>
                  Tap the microphone above to speak structured records or flexible field dictations.
                </Text>
              </View>
            ) : (
              recentDataEntries.map((entry) => {
                const isFlex = entry.isFlexible || entry.templateId === 'flexible' || !!entry.flexibleFields;
                const rowCount = entry.tableRows?.length || 0;

                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.dataRecordCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/modal/data-entry-edit',
                        params: { entryId: entry.id, templateId: entry.templateId },
                      })
                    }
                  >
                    <View style={styles.dataRecordTop}>
                      <View style={styles.dataRecordTemplatePill}>
                        <Ionicons
                          name={isFlex ? 'sparkles' : 'grid'}
                          size={12}
                          color={COLORS.dataColor}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.dataRecordTemplateName}>
                          {isFlex ? entry.title || 'Flexible Entry' : entry.templateName}
                        </Text>
                        {isFlex && (
                          <View style={styles.flexPill}>
                            <Text style={styles.flexPillText}>Auto</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dataRecordDate}>{formatDateDisplay(entry.date)}</Text>
                    </View>

                    <View style={styles.dataRecordMetricsRow}>
                      {isFlex && entry.flexibleFields && entry.flexibleFields.length > 0 ? (
                        entry.flexibleFields.slice(0, 3).map((f, fIdx) => (
                          <View key={`flx_${fIdx}`} style={styles.metricPill}>
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
                          <Text style={[styles.metricPillVal, { color: COLORS.dataColor }]}>
                            {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {entry.rawTranscript ? (
                      <Text style={styles.dataRecordTranscript} numberOfLines={1}>
                        "{entry.rawTranscript}"
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* Financial Transactions Feed */
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="mic-circle-outline" size={40} color={COLORS.textSubtle} />
                <Text style={styles.emptyTitle}>No transactions recorded yet</Text>
                <Text style={styles.emptySub}>
                  Tap the microphone above and speak e.g. "Paid 450 rupees for groceries"
                </Text>
              </View>
            ) : (
              recentTransactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
            )}
          </View>
        )}
      </ScrollView>

      {/* Recording Overlay Modal */}
      <RecordingOverlay
        visible={recorder.state !== 'Ready'}
        state={recorder.state}
        durationSeconds={recorder.durationSeconds}
        mode={mode}
        templateName={getMicTemplateLabel()}
        onStop={handleMicPress}
        onCancel={recorder.cancelRecording}
        errorMessage={recorder.errorMessage}
        onRetry={recorder.startRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  queryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  queryHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  greetingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActiveExpense: {
    backgroundColor: COLORS.primary,
  },
  modeBtnActiveReceipt: {
    backgroundColor: '#8B5CF6',
  },
  modeBtnActiveData: {
    backgroundColor: COLORS.dataColor,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  templatePickerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  voiceDataSubToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  voiceDataSubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  voiceDataSubBtnActive: {
    backgroundColor: COLORS.dataColor,
  },
  voiceDataSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  voiceDataSubTextActive: {
    color: '#FFFFFF',
  },
  flexibleInfoBox: {
    paddingVertical: 4,
  },
  flexibleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flexibleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  flexibleDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 6,
  },
  templateCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeTemplateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 6,
  },
  templatePill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  templatePillText: {
    color: COLORS.dataColor,
    fontSize: 10,
    fontWeight: '700',
  },
  templateSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  templateActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageTemplatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 6,
  },
  manageTemplatesText: {
    color: COLORS.dataColor,
    fontSize: 12,
    fontWeight: '700',
  },
  newTemplateBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.dataColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateChipsScroll: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  tmplChip: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tmplChipActive: {
    backgroundColor: COLORS.dataColor,
    borderColor: COLORS.dataColor,
  },
  tmplChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tmplChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  manualEntryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  dataRecordCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dataRecordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataRecordTemplatePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataRecordTemplateName: {
    fontSize: 14,
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
  dataRecordDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dataRecordMetricsRow: {
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
  dataRecordTranscript: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
