import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DataTemplate, TemplateField, FieldType } from '../../src/types';
import { COLORS } from '../../src/constants';
import { templateRepository } from '../../src/repositories';

const FIELD_TYPES: { type: FieldType; label: string; icon: any }[] = [
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'number', label: 'Number', icon: 'calculator' },
  { type: 'date', label: 'Date', icon: 'calendar' },
  { type: 'time', label: 'Time', icon: 'time' },
];

export default function TemplateEditModal() {
  const params = useLocalSearchParams<{ templateId?: string }>();
  const isEditing = !!params.templateId;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [hasTable, setHasTable] = useState<boolean>(false);
  const [tableTitle, setTableTitle] = useState<string>('Repeated Entries');
  const [tableFields, setTableFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadTemplate();
  }, [params.templateId]);

  const loadTemplate = async () => {
    if (params.templateId) {
      const tmpl = await templateRepository.getTemplateById(params.templateId);
      if (tmpl) {
        setName(tmpl.name);
        setDescription(tmpl.description || '');
        setFields(tmpl.fields || []);
        setHasTable(!!tmpl.hasTable);
        setTableTitle(tmpl.tableTitle || 'Repeated Entries');
        setTableFields(tmpl.tableFields || []);
        return;
      }
    }

    // Default template starter for new template creation
    setName('');
    setDescription('');
    setFields([
      {
        id: `f_${Date.now()}_1`,
        name: 'Item Name',
        extractionKey: 'item_name',
        type: 'text',
        placeholder: 'e.g. Product A',
      },
      {
        id: `f_${Date.now()}_2`,
        name: 'Batch / Lot No',
        extractionKey: 'batch_no',
        type: 'text',
        placeholder: 'e.g. B-101',
      },
      {
        id: `f_${Date.now()}_3`,
        name: 'Quantity',
        extractionKey: 'quantity',
        type: 'number',
        placeholder: 'e.g. 50',
      },
    ]);
    setHasTable(true);
    setTableTitle('Repeated Entries');
    setTableFields([
      {
        id: `tf_${Date.now()}_1`,
        name: 'Start Time',
        extractionKey: 'start_time',
        type: 'time',
        placeholder: '09:00 AM',
      },
      {
        id: `tf_${Date.now()}_2`,
        name: 'End Time',
        extractionKey: 'end_time',
        type: 'time',
        placeholder: '10:00 AM',
      },
      {
        id: `tf_${Date.now()}_3`,
        name: 'Produced Qty',
        extractionKey: 'produced_qty',
        type: 'number',
        placeholder: '100',
      },
    ]);
  };

  const toSlugKey = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleAddField = () => {
    const newField: TemplateField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: `Custom Field ${fields.length + 1}`,
      extractionKey: `custom_field_${fields.length + 1}`,
      type: 'text',
      placeholder: '',
    };
    setFields((prev) => [...prev, newField]);
  };

  const handleUpdateField = (index: number, key: keyof TemplateField, value: any) => {
    setFields((prev) => {
      const copy = [...prev];
      const field = { ...copy[index], [key]: value };
      if (key === 'name' && (!copy[index].extractionKey || copy[index].extractionKey === toSlugKey(copy[index].name))) {
        field.extractionKey = toSlugKey(value);
      }
      copy[index] = field;
      return copy;
    });
  };

  const handleDeleteField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddTableColumn = () => {
    const newCol: TemplateField = {
      id: `tf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: `Column ${tableFields.length + 1}`,
      extractionKey: `column_${tableFields.length + 1}`,
      type: 'text',
      placeholder: '',
    };
    setTableFields((prev) => [...prev, newCol]);
  };

  const handleUpdateTableColumn = (index: number, key: keyof TemplateField, value: any) => {
    setTableFields((prev) => {
      const copy = [...prev];
      const col = { ...copy[index], [key]: value };
      if (key === 'name' && (!copy[index].extractionKey || copy[index].extractionKey === toSlugKey(copy[index].name))) {
        col.extractionKey = toSlugKey(value);
      }
      copy[index] = col;
      return copy;
    });
  };

  const handleDeleteTableColumn = (index: number) => {
    setTableFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a template name.');
      return;
    }

    if (fields.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one single field.');
      return;
    }

    try {
      setSaving(true);
      const templateToSave: DataTemplate = {
        id: params.templateId || `template_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        isDefault: false,
        fields,
        hasTable,
        tableTitle: tableTitle.trim() || 'Repeated Entries',
        tableFields: hasTable ? tableFields : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await templateRepository.saveTemplate(templateToSave);
      Alert.alert('Template Saved', `"${templateToSave.name}" has been saved successfully.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Template' : 'Create Template'}</Text>
        <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.saveHeaderText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Template Overview Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Template Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Template Name *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Quality Control Inspection"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Production line batch & QA metrics"
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>
        </View>

        {/* Single Fields Builder */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Form Fields</Text>
              <Text style={styles.sectionSubTitle}>Define fields to be extracted by AI</Text>
            </View>
            <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddField}>
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addSmallBtnText}>Add Field</Text>
            </TouchableOpacity>
          </View>

          {fields.map((field, idx) => (
            <View key={field.id} style={styles.fieldBuilderItem}>
              <View style={styles.fieldItemTop}>
                <Text style={styles.fieldIndexNumber}>#{idx + 1}</Text>
                <TouchableOpacity
                  style={styles.deleteFieldBtn}
                  onPress={() => handleDeleteField(idx)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.builderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.miniLabel}>Field Label</Text>
                  <TextInput
                    style={styles.miniInput}
                    value={field.name}
                    onChangeText={(val) => handleUpdateField(idx, 'name', val)}
                    placeholder="e.g. Part No"
                    placeholderTextColor={COLORS.textSubtle}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Extraction Key (AI)</Text>
                  <TextInput
                    style={[styles.miniInput, { color: COLORS.dataColor, fontFamily: 'monospace' }]}
                    value={field.extractionKey}
                    onChangeText={(val) => handleUpdateField(idx, 'extractionKey', val)}
                    placeholder="e.g. part_no"
                    placeholderTextColor={COLORS.textSubtle}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Type Selectors */}
              <View style={styles.typeSelectorRow}>
                {FIELD_TYPES.map((ft) => {
                  const isSelected = field.type === ft.type;
                  return (
                    <TouchableOpacity
                      key={ft.type}
                      style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                      onPress={() => handleUpdateField(idx, 'type', ft.type)}
                    >
                      <Ionicons
                        name={ft.icon}
                        size={12}
                        color={isSelected ? '#FFFFFF' : COLORS.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                        {ft.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Repeated Entries Table Builder */}
        <View style={styles.sectionCard}>
          <View style={styles.tableToggleHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.sectionTitle}>Repeated Entries Table</Text>
              <Text style={styles.sectionSubTitle}>
                Support multi-row dictation (e.g. hourly logs, cycle steps)
              </Text>
            </View>
            <Switch
              value={hasTable}
              onValueChange={setHasTable}
              trackColor={{ false: COLORS.cardBorder, true: COLORS.dataColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          {hasTable && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Table Header Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={tableTitle}
                  onChangeText={setTableTitle}
                  placeholder="e.g. Repeated Entries / Hourly Production Log"
                  placeholderTextColor={COLORS.textSubtle}
                />
              </View>

              <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Table Columns</Text>
                <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddTableColumn}>
                  <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.addSmallBtnText}>Add Column</Text>
                </TouchableOpacity>
              </View>

              {tableFields.map((col, idx) => (
                <View key={col.id} style={styles.fieldBuilderItem}>
                  <View style={styles.fieldItemTop}>
                    <Text style={styles.fieldIndexNumber}>Col #{idx + 1}</Text>
                    <TouchableOpacity
                      style={styles.deleteFieldBtn}
                      onPress={() => handleDeleteTableColumn(idx)}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.builderRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.miniLabel}>Column Name</Text>
                      <TextInput
                        style={styles.miniInput}
                        value={col.name}
                        onChangeText={(val) => handleUpdateTableColumn(idx, 'name', val)}
                        placeholder="e.g. Start Time"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniLabel}>Extraction Key</Text>
                      <TextInput
                        style={[styles.miniInput, { color: COLORS.dataColor, fontFamily: 'monospace' }]}
                        value={col.extractionKey}
                        onChangeText={(val) => handleUpdateTableColumn(idx, 'extractionKey', val)}
                        placeholder="e.g. start_time"
                        placeholderTextColor={COLORS.textSubtle}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.typeSelectorRow}>
                    {FIELD_TYPES.map((ft) => {
                      const isSelected = col.type === ft.type;
                      return (
                        <TouchableOpacity
                          key={ft.type}
                          style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                          onPress={() => handleUpdateTableColumn(idx, 'type', ft.type)}
                        >
                          <Ionicons
                            name={ft.icon}
                            size={12}
                            color={isSelected ? '#FFFFFF' : COLORS.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}
                          >
                            {ft.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Save Action */}
        <TouchableOpacity
          style={[styles.saveMainBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveMainBtnText}>{saving ? 'Saving Template...' : 'Save Template'}</Text>
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
  headerBtn: {
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
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  saveHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldBuilderItem: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fieldItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIndexNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dataColor,
  },
  deleteFieldBtn: {
    padding: 4,
  },
  builderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeChipSelected: {
    backgroundColor: COLORS.dataColor,
    borderColor: COLORS.dataColor,
  },
  typeChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tableToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dataColor,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    elevation: 4,
    shadowColor: COLORS.dataColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveMainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
