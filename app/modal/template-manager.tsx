import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTemplates } from '../../src/hooks/useTemplates';
import { DataTemplate } from '../../src/types';
import { COLORS, DEFAULT_MONITORING_DETAILS_TEMPLATE } from '../../src/constants';

export default function TemplateManagerModal() {
  const {
    templates,
    activeTemplateId,
    loading,
    refreshTemplates,
    selectActiveTemplate,
    deleteTemplate,
    saveTemplate,
    resetTemplates,
  } = useTemplates();

  useFocusEffect(
    React.useCallback(() => {
      refreshTemplates();
    }, [refreshTemplates])
  );

  const handleSelect = async (tmpl: DataTemplate) => {
    await selectActiveTemplate(tmpl.id);
    Alert.alert('Active Template Set', `"${tmpl.name}" is now the active template on Home screen.`);
  };

  const handleEdit = (tmpl: DataTemplate) => {
    router.push({
      pathname: '/modal/template-edit',
      params: { templateId: tmpl.id },
    });
  };

  const handleDuplicate = async (tmpl: DataTemplate) => {
    const clone: DataTemplate = {
      ...tmpl,
      id: `template_custom_${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTemplate(clone);
    Alert.alert('Template Duplicated', `Created a copy: "${clone.name}". You can now edit its fields.`);
  };

  const handleDelete = (tmpl: DataTemplate) => {
    if (tmpl.id === DEFAULT_MONITORING_DETAILS_TEMPLATE.id) {
      Alert.alert('Default Template', 'The default "Monitoring Details" template cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${tmpl.name}"? Existing data entries using this template will remain saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(tmpl.id);
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Templates',
      'This will reset your active template back to the default "Monitoring Details" template.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await resetTemplates();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Template Manager</Text>
        <TouchableOpacity
          style={styles.newTemplateHeaderBtn}
          onPress={() => router.push('/modal/template-edit')}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newTemplateHeaderText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="layers" size={28} color={COLORS.dataColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Custom Data Templates</Text>
            <Text style={styles.bannerSub}>
              Select an active template for Voice-to-Data recording or create your own custom schemas.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.dataColor} style={{ marginTop: 30 }} />
        ) : (
          templates.map((tmpl) => {
            const isActive = tmpl.id === activeTemplateId;
            return (
              <View
                key={tmpl.id}
                style={[styles.templateCard, isActive && styles.templateCardActive]}
              >
                <View style={styles.templateCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.templateNameRow}>
                      <Text style={styles.templateName}>{tmpl.name}</Text>
                      {tmpl.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>

                    {tmpl.description ? (
                      <Text style={styles.templateDescription}>{tmpl.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Field Tags */}
                <View style={styles.fieldTagsRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="list" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaChipText}>{tmpl.fields.length} Fields</Text>
                  </View>

                  {tmpl.hasTable && (
                    <View style={[styles.metaChip, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                      <Ionicons name="grid" size={13} color={COLORS.dataColor} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaChipText, { color: COLORS.dataColor }]}>
                        Table ({tmpl.tableFields?.length || 0} Cols)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {!isActive ? (
                    <TouchableOpacity
                      style={styles.selectActiveBtn}
                      onPress={() => handleSelect(tmpl)}
                    >
                      <Ionicons name="radio-button-off" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                      <Text style={styles.selectActiveText}>Set Active</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.selectedPill}>
                      <Ionicons name="radio-button-on" size={16} color={COLORS.success} style={{ marginRight: 6 }} />
                      <Text style={styles.selectedPillText}>Currently Active</Text>
                    </View>
                  )}

                  <View style={styles.rightCardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleEdit(tmpl)}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDuplicate(tmpl)}
                    >
                      <Ionicons name="copy-outline" size={18} color={COLORS.text} />
                    </TouchableOpacity>

                    {!tmpl.isDefault && (
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.deleteIconBtn]}
                        onPress={() => handleDelete(tmpl)}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              </View>
            );
          })
        )}

        {/* Create New Template CTA */}
        <TouchableOpacity
          style={styles.createCardCTA}
          onPress={() => router.push('/modal/template-edit')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.dataColor} style={{ marginRight: 10 }} />
          <Text style={styles.createCTAText}>Create Custom Data Template</Text>
        </TouchableOpacity>

        {/* Reset Defaults button */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetDefaults}>
          <Ionicons name="refresh" size={16} color={COLORS.textSubtle} style={{ marginRight: 6 }} />
          <Text style={styles.resetText}>Reset Active Template to Default</Text>
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
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  newTemplateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  newTemplateHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bannerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  templateCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  templateCardActive: {
    borderColor: COLORS.dataColor,
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  defaultBadgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  templateDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  fieldTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metaChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  selectActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  selectActiveText: {
    color: COLORS.dataColor,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPillText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '700',
  },
  rightCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  deleteIconBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  createCardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 20,
  },
  createCTAText: {
    color: COLORS.dataColor,
    fontSize: 15,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  resetText: {
    color: COLORS.textSubtle,
    fontSize: 13,
  },
});
