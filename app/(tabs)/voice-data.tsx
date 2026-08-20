import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
  const [dataMode, setDataMode] = useState<'flexible' | 'template'>('flexible');
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
            <Text style={styles.appSubtitle}>Autonomous dictation & structured templates</Text>
          </View>

          <TouchableOpacity
            style={styles.templateHeaderBtn}
            onPress={() => router.push('/modal/template-manager')}
          >
            <Ionicons name="layers" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.templateHeaderText}>Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Switcher */}
        <View style={styles.modeToggleRow}>
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
              Flexible Auto-Detect
            </Text>
          </TouchableOpacity>

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
              Template Form
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
              ? 'Listening... Tap to Stop & Extract'
              : 'Tap microphone to speak or enter manually below'}
          </Text>

          {/* Direct "Enter Manually" Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.manualEntryBtn}
            onPress={handleEnterManually}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.dataColor} style={{ marginRight: 6 }} />
            <Text style={styles.manualEntryBtnText}>Enter Manually Without Voice</Text>
          </TouchableOpacity>
        </View>

        {/* Recent EPR Records List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Voice-to-Data Records</Text>
          <Text style={styles.sectionBadge}>{recentEntries.length}</Text>
        </View>

        {recentEntries.length === 0 ? (
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

      {/* Recording Fullscreen Overlay */}
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
    marginBottom: 24,
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
