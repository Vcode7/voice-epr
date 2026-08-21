import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MicrophoneButton } from '../../src/components/voice/MicrophoneButton';
import { RecordingOverlay } from '../../src/components/voice/RecordingOverlay';
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';
import { useTemplates } from '../../src/hooks/useTemplates';
import { useDataEntries } from '../../src/hooks/useDataEntries';
import { GroqService } from '../../src/services/groq/groqService';
import { COLORS } from '../../src/constants';
import { formatDateDisplay } from '../../src/utils/dateUtils';
import { DataEntryRecord } from '../../src/types';

export default function VoiceDataScreen() {
  // 1. Default mode is 'template'
  const [dataMode, setDataMode] = useState<'flexible' | 'template'>('template');
  const [refreshing, setRefreshing] = useState(false);
  const recorder = useAudioRecorder();
  const { templates, activeTemplate, refreshTemplates } = useTemplates();
  const { dataEntries, refreshDataEntries, removeDataEntry } = useDataEntries();

  useFocusEffect(
    React.useCallback(() => {
      refreshTemplates();
      refreshDataEntries();
    }, [refreshTemplates, refreshDataEntries])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshTemplates(), refreshDataEntries()]);
    setRefreshing(false);
  };

  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const uri = await recorder.stopRecording();
      if (!uri) return;

      try {
        recorder.setState('Transcribing');
        const transcript = await GroqService.transcribeAudio(uri);

        recorder.setState('Understanding');
        if (dataMode === 'flexible') {
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
      } catch (err: any) {
        console.error('[Voice-to-Data Processing Error]', err);
        recorder.setErrorMessage(err?.message || 'Processing failed. Please try again.');
        recorder.setState('Error');
      }
    } else {
      await recorder.startRecording();
    }
  };

  const handleEnterManually = () => {
    if (dataMode === 'flexible') {
      router.push({
        pathname: '/modal/data-entry-edit',
        params: {
          isFlexible: 'true',
        },
      });
    } else {
      router.push({
        pathname: '/modal/data-entry-edit',
        params: {
          templateId: activeTemplate.id,
          isFlexible: 'false',
        },
      });
    }
  };

  const handleDeleteRecord = (entry: DataEntryRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete "${entry.title || entry.templateName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeDataEntry(entry.id);
          },
        },
      ]
    );
  };

  const isPending =
    recorder.state === 'Recording' ||
    recorder.state === 'Transcribing' ||
    recorder.state === 'Understanding' ||
    recorder.state === 'Processing';

  const recentEntries = dataEntries.slice(0, 10);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.dataColor} />
        }
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Voice to Data EPR</Text>
            <Text style={styles.appSubtitle}>Autonomous dictation &amp; structured templates</Text>
          </View>

          <TouchableOpacity
            style={styles.templateHeaderBtn}
            onPress={() => router.push('/modal/template-manager')}
          >
            <Ionicons name="layers" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.templateHeaderText}>Templates ({templates.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Switcher (Default: Template Form) */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              dataMode === 'template' && styles.modeBtnActiveTemplate,
            ]}
            onPress={() => setDataMode('template')}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={dataMode === 'template' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeBtnText,
                dataMode === 'template' && styles.modeBtnTextActive,
              ]}
            >
              📑 Template Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              dataMode === 'flexible' && styles.modeBtnActiveFlexible,
            ]}
            onPress={() => setDataMode('flexible')}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={dataMode === 'flexible' ? '#000000' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeBtnText,
                dataMode === 'flexible' && styles.modeBtnTextActiveDark,
              ]}
            >
              ✨ Flexible Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Template Selector Bar (if Template Mode) */}
        {dataMode === 'template' && (
          <View style={styles.activeTemplateCard}>
            <View style={styles.activeTemplateInfo}>
              <Text style={styles.activeTemplateLabel}>ACTIVE TEMPLATE</Text>
              <Text style={styles.activeTemplateName} numberOfLines={1}>
                {activeTemplate.name}
              </Text>
              <Text style={styles.activeTemplateMeta}>
                {activeTemplate.fields.length} fields •{' '}
                {activeTemplate.hasTable ? 'With table' : 'No table'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.switchTemplateBtn}
              onPress={() => router.push('/modal/template-manager')}
            >
              <Ionicons name="swap-horizontal" size={14} color={COLORS.dataColor} />
              <Text style={styles.switchTemplateText}>Switch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Microphone Voice Console */}
        <View style={styles.voiceConsole}>
          <MicrophoneButton
            recordingState={recorder.state}
            onPress={handleMicPress}
            templateName={dataMode === 'flexible' ? '✨ Flexible (Auto-Detect)' : activeTemplate.name}
          />

          <Text style={styles.voicePromptText}>
            {recorder.state === 'Recording'
              ? 'Listening to speech... Tap to Stop & Extract'
              : recorder.state === 'Transcribing'
              ? 'Transcribing speech with Whisper AI...'
              : recorder.state === 'Understanding'
              ? 'Extracting structured entities...'
              : 'Tap microphone to dictate or enter manually below'}
          </Text>

          {/* Direct "Enter Manually" Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.manualEntryBtn}
            onPress={handleEnterManually}
            disabled={isPending}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.dataColor} style={{ marginRight: 6 }} />
            <Text style={styles.manualEntryBtnText}>+ Enter Manually Without Voice</Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* LIVE LOADING / EXTRACTION SKELETON PREVIEW CARD (While Recording/Extracting) */}
        {/* ========================================================================= */}
        {isPending && (
          <View style={styles.pendingCard}>
            {/* Header with pulsating badge */}
            <View style={styles.pendingHeader}>
              <View style={styles.pendingTitleRow}>
                <View style={styles.liveDot} />
                <Text style={styles.pendingTitle}>
                  {dataMode === 'template' ? activeTemplate.name : 'Flexible Extraction'}
                </Text>
              </View>

              <View style={styles.pendingStatusBadge}>
                <ActivityIndicator size="small" color={COLORS.dataColor} style={{ marginRight: 4 }} />
                <Text style={styles.pendingStatusText}>
                  {recorder.state === 'Recording'
                    ? 'Recording Voice'
                    : recorder.state === 'Transcribing'
                    ? 'Transcribing...'
                    : 'Extracting...'}
                </Text>
              </View>
            </View>

            {/* TEMPLATE EXTRACTION: Show Template Structure Preview & Field Skeletons */}
            {dataMode === 'template' ? (
              <View style={styles.templatePreviewBox}>
                <View style={styles.previewInfoBanner}>
                  <Ionicons name="layers" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewBannerTitle}>Template Output Structure Preview</Text>
                    <Text style={styles.previewBannerSubtitle}>
                      Listening for "{activeTemplate.name}" fields &amp; parameters...
                    </Text>
                  </View>
                  <Text style={styles.previewFieldsCount}>{activeTemplate.fields.length} fields</Text>
                </View>

                {/* Skeletons of Template Fields */}
                <Text style={styles.previewFieldsHeader}>Target Template Fields</Text>
                <View style={styles.previewFieldsGrid}>
                  {activeTemplate.fields.map((field) => (
                    <View key={field.id} style={styles.skeletonFieldBox}>
                      <View style={styles.skeletonFieldHeader}>
                        <Text style={styles.skeletonFieldName} numberOfLines={1}>
                          {field.name}
                        </Text>
                        <Text style={styles.skeletonFieldType}>{field.type}</Text>
                      </View>
                      <View style={styles.skeletonPlaceholderBar}>
                        <Text style={styles.skeletonListeningText} numberOfLines={1}>
                          Listening for {field.name}...
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Table Header Preview (if template has table) */}
                {activeTemplate.hasTable && activeTemplate.tableFields?.length > 0 && (
                  <View style={styles.previewTableBox}>
                    <View style={styles.previewTableHeaderRow}>
                      <Ionicons name="grid-outline" size={13} color={COLORS.dataColor} style={{ marginRight: 4 }} />
                      <Text style={styles.previewTableTitle}>
                        {activeTemplate.tableTitle || 'Repeated Entries Table'} (Preview)
                      </Text>
                    </View>
                    <View style={styles.previewTableColumnsRow}>
                      {activeTemplate.tableFields.map((tf) => (
                        <View key={tf.id} style={styles.previewTableColPill}>
                          <Text style={styles.previewTableColText} numberOfLines={1}>{tf.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* FLEXIBLE EXTRACTION: Minimalist loading state, no template fields */
              <View style={styles.flexibleExtractingBox}>
                <Ionicons name="sparkles" size={28} color={COLORS.dataColor} style={{ marginBottom: 8 }} />
                <Text style={styles.flexibleExtractingTitle}>Extracting Flexible Schema...</Text>
                <Text style={styles.flexibleExtractingSub}>
                  Autonomous AI will detect fields, parameters, and tables from voice dictation.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent EPR Records List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Voice-to-Data Records</Text>
          <Text style={styles.sectionBadge}>{recentEntries.length}</Text>
        </View>

        {recentEntries.length === 0 && !isPending ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={36} color={COLORS.cardBorder} />
            <Text style={styles.emptyText}>No Voice-to-Data records yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the mic to dictate production logs, or tap "Enter Manually"
            </Text>
          </View>
        ) : (
          recentEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              activeOpacity={0.8}
              style={styles.entryCard}
              onPress={() =>
                router.push({
                  pathname: '/modal/data-entry-edit',
                  params: { entryId: entry.id },
                })
              }
            >
              <View style={styles.entryCardHeader}>
                <View style={styles.entryIconBg}>
                  <Ionicons name="document-text" size={18} color={COLORS.dataColor} />
                </View>

                <View style={styles.entryHeaderContent}>
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {entry.title || entry.templateName || 'EPR Record'}
                  </Text>
                  <View style={styles.entryMetaRow}>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>
                        {entry.isFlexible ? 'Flexible' : entry.templateName}
                      </Text>
                    </View>
                    <Text style={styles.entryDate}>{formatDateDisplay(entry.date)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteRecord(entry)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {/* Preview fields */}
              <View style={styles.entryFieldsPreview}>
                {entry.isFlexible ? (
                  (entry.flexibleFields || []).slice(0, 3).map((f, idx) => (
                    <View key={idx} style={styles.fieldPill}>
                      <Text style={styles.fieldPillKey}>{f.name}:</Text>
                      <Text style={styles.fieldPillVal} numberOfLines={1}>
                        {String(f.value || '-')}
                      </Text>
                    </View>
                  ))
                ) : (
                  Object.entries(entry.fieldValues || {}).slice(0, 3).map(([k, v], idx) => (
                    <View key={idx} style={styles.fieldPill}>
                      <Text style={styles.fieldPillKey}>{k}:</Text>
                      <Text style={styles.fieldPillVal} numberOfLines={1}>
                        {String(v || '-')}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {entry.tableRows && entry.tableRows.length > 0 && (
                <View style={styles.entryTableBadge}>
                  <Ionicons name="grid-outline" size={12} color={COLORS.textSubtle} style={{ marginRight: 4 }} />
                  <Text style={styles.entryTableBadgeText}>
                    {entry.tableRows.length} repeated table rows
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Recording Fullscreen Overlay (if used) */}
      <RecordingOverlay
        state={recorder.state}
        durationSeconds={recorder.durationSeconds}
        volumeLevel={recorder.volumeLevel}
        onCancel={recorder.cancelRecording}
        onStop={handleMicPress}
        mode="data"
        templateName={dataMode === 'flexible' ? '✨ Flexible (Auto-Detect)' : activeTemplate.name}
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
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  templateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  templateHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActiveFlexible: {
    backgroundColor: COLORS.dataColor,
  },
  modeBtnActiveTemplate: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modeBtnTextActiveDark: {
    color: '#000000',
    fontWeight: '700',
  },
  activeTemplateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  activeTemplateInfo: {
    flex: 1,
    marginRight: 8,
  },
  activeTemplateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.dataColor,
    letterSpacing: 0.8,
  },
  activeTemplateName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  activeTemplateMeta: {
    fontSize: 11,
    color: COLORS.textSubtle,
    marginTop: 2,
  },
  switchTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  switchTemplateText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dataColor,
    marginLeft: 4,
  },
  voiceConsole: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  voicePromptText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 14,
    textAlign: 'center',
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    marginTop: 16,
  },
  manualEntryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dataColor,
  },
  // Pending Loading / Skeleton Card Styles
  pendingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.6)',
    marginBottom: 16,
    shadowColor: COLORS.dataColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingBottom: 10,
    marginBottom: 12,
  },
  pendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dataColor,
    marginRight: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  pendingStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dataColor,
  },
  templatePreviewBox: {
    gap: 10,
  },
  previewInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  previewBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewBannerSubtitle: {
    fontSize: 10,
    color: 'rgba(6, 182, 212, 0.9)',
    marginTop: 1,
  },
  previewFieldsCount: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dataColor,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewFieldsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skeletonFieldBox: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  skeletonFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skeletonFieldName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 4,
  },
  skeletonFieldType: {
    fontSize: 8,
    color: 'rgba(6, 182, 212, 0.7)',
    fontFamily: 'monospace',
  },
  skeletonPlaceholderBar: {
    height: 24,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  skeletonListeningText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: 'rgba(6, 182, 212, 0.7)',
  },
  previewTableBox: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  previewTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTableTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
  },
  previewTableColumnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  previewTableColPill: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  previewTableColText: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  flexibleExtractingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  flexibleExtractingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  flexibleExtractingSub: {
    fontSize: 11,
    color: COLORS.textSubtle,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  // Recent List Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dataColor,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textSubtle,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  entryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  entryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entryHeaderContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginRight: 8,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.dataColor,
  },
  entryDate: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  deleteBtn: {
    padding: 6,
  },
  entryFieldsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  fieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: '48%',
  },
  fieldPillKey: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    marginRight: 4,
    textTransform: 'uppercase',
  },
  fieldPillVal: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  entryTableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  entryTableBadgeText: {
    fontSize: 10,
    color: COLORS.textSubtle,
    fontWeight: '500',
  },
});
