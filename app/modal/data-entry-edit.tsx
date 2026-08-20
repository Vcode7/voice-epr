import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  DataTemplate,
  DataEntryRecord,
  ExtractedDataResult,
  FlexibleExtractedResult,
  FlexibleField,
  TemplateField,
} from '../../src/types';
import { COLORS, DEFAULT_MONITORING_DETAILS_TEMPLATE } from '../../src/constants';
import { templateRepository, dataEntryRepository } from '../../src/repositories';
import { getTodayString, formatDateDisplay } from '../../src/utils/dateUtils';
import { PdfGeneratorService } from '../../src/services/pdf/pdfService';

export default function DataEntryEditModal() {
  const params = useLocalSearchParams<{
    extractedJson?: string;
    flexibleJson?: string;
    templateId?: string;
    entryId?: string;
    isFlexible?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mode: Template-based vs Flexible
  const [isFlexible, setIsFlexible] = useState<boolean>(false);
  const [flexibleTitle, setFlexibleTitle] = useState<string>('Flexible Voice Entry');
  const [flexibleFields, setFlexibleFields] = useState<FlexibleField[]>([]);
  const [flexibleTableTitle, setFlexibleTableTitle] = useState<string>('Detected Table');
  const [flexibleTableHeaders, setFlexibleTableHeaders] = useState<string[]>([]);
  const [flexibleTableRows, setFlexibleTableRows] = useState<string[][]>([]);

  // Template-based State
  const [template, setTemplate] = useState<DataTemplate>(DEFAULT_MONITORING_DETAILS_TEMPLATE);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tableRows, setTableRows] = useState<Array<Record<string, string>>>([]);

  // Shared metadata
  const [entryDate, setEntryDate] = useState<string>(getTodayString());
  const [transcript, setTranscript] = useState<string>('');
  const [showTranscript, setShowTranscript] = useState<boolean>(true);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params.extractedJson, params.flexibleJson, params.templateId, params.entryId, params.isFlexible]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Case: Flexible voice dictation passed
      if (params.flexibleJson) {
        setIsFlexible(true);
        try {
          const parsed: FlexibleExtractedResult = JSON.parse(params.flexibleJson);
          setFlexibleTitle(parsed.title || 'Flexible Voice Entry');
          setTranscript(parsed.raw_transcript || '');
          setFlexibleFields(
            (parsed.fields || []).map((f, i) => ({
              id: f.id || `flex_f_${i}_${Date.now()}`,
              name: f.name || `Field ${i + 1}`,
              value: f.value !== null && f.value !== undefined ? String(f.value) : '',
            }))
          );

          if (parsed.table && parsed.table.headers && parsed.table.headers.length > 0) {
            setFlexibleTableTitle(parsed.table.title || 'Detected Table');
            setFlexibleTableHeaders(parsed.table.headers);
            setFlexibleTableRows(parsed.table.rows || []);
          } else {
            setFlexibleTableHeaders([]);
            setFlexibleTableRows([]);
          }
        } catch (e) {
          console.error('Failed to parse flexibleJson:', e);
        }
        setLoading(false);
        return;
      }

      // 2. Case: Editing existing record
      if (params.entryId) {
        const existing = await dataEntryRepository.getDataEntryById(params.entryId);
        if (existing) {
          setIsEditingExisting(true);
          setExistingRecordId(existing.id);
          setEntryDate(existing.date);
          setTranscript(existing.rawTranscript || '');

          if (existing.isFlexible || existing.templateId === 'flexible' || existing.flexibleFields) {
            setIsFlexible(true);
            setFlexibleTitle(existing.title || existing.templateName || 'Flexible Voice Entry');

            if (existing.flexibleFields && existing.flexibleFields.length > 0) {
              setFlexibleFields(
                existing.flexibleFields.map((f, i) => ({
                  id: f.id || `flex_f_${i}_${Date.now()}`,
                  name: f.name,
                  value: f.value !== null && f.value !== undefined ? String(f.value) : '',
                }))
              );
            } else {
              const fromValues = Object.entries(existing.fieldValues || {}).map(([k, v], i) => ({
                id: `flex_f_${i}_${Date.now()}`,
                name: k,
                value: v !== null && v !== undefined ? String(v) : '',
              }));
              setFlexibleFields(fromValues);
            }

            if (existing.tableHeaders && existing.tableHeaders.length > 0) {
              setFlexibleTableTitle(existing.tableTitle || 'Detected Table');
              setFlexibleTableHeaders(existing.tableHeaders);
              if (Array.isArray(existing.tableRows) && existing.tableRows.length > 0) {
                if (Array.isArray(existing.tableRows[0])) {
                  setFlexibleTableRows(existing.tableRows as string[][]);
                } else {
                  const rowsAsArrays = (existing.tableRows as Array<Record<string, any>>).map((row) =>
                    existing.tableHeaders!.map((h) => (row[h] !== undefined ? String(row[h]) : ''))
                  );
                  setFlexibleTableRows(rowsAsArrays);
                }
              } else {
                setFlexibleTableRows([]);
              }
            }
            setLoading(false);
            return;
          } else {
            // Standard template record
            let targetTemplate: DataTemplate = DEFAULT_MONITORING_DETAILS_TEMPLATE;
            const foundTemplate = await templateRepository.getTemplateById(existing.templateId);
            if (foundTemplate) targetTemplate = foundTemplate;
            setTemplate(targetTemplate);

            const initialFields: Record<string, string> = {};
            targetTemplate.fields.forEach((f) => {
              initialFields[f.extractionKey] = f.defaultValue || '';
            });

            const populatedFields: Record<string, string> = { ...initialFields };
            Object.keys(existing.fieldValues || {}).forEach((k) => {
              const v = existing.fieldValues[k];
              populatedFields[k] = v !== null && v !== undefined ? String(v) : '';
            });
            setFieldValues(populatedFields);

            const populatedRows = (existing.tableRows || []).map((row) => {
              const r: Record<string, string> = {};
              const rowObj = (row as Record<string, any>) || {};
              targetTemplate.tableFields.forEach((col) => {
                const v = rowObj[col.extractionKey] ?? rowObj[col.id];
                r[col.extractionKey] = v !== null && v !== undefined ? String(v) : '';
              });
              return r;
            });
            setTableRows(populatedRows);
            setLoading(false);
            return;
          }
        }
      }

      // 3. Case: Template-based extracted result
      if (params.extractedJson) {
        let targetTemplate: DataTemplate = DEFAULT_MONITORING_DETAILS_TEMPLATE;
        const targetTemplateId = params.templateId || DEFAULT_MONITORING_DETAILS_TEMPLATE.id;
        const foundTemplate = await templateRepository.getTemplateById(targetTemplateId);
        if (foundTemplate) targetTemplate = foundTemplate;
        setTemplate(targetTemplate);

        const initialFields: Record<string, string> = {};
        targetTemplate.fields.forEach((f) => {
          initialFields[f.extractionKey] = f.defaultValue || '';
        });

        try {
          const parsed: ExtractedDataResult = JSON.parse(params.extractedJson);
          setTranscript(parsed.raw_transcript || '');

          const populatedFields: Record<string, string> = { ...initialFields };
          if (parsed.fieldValues) {
            Object.keys(parsed.fieldValues).forEach((k) => {
              const v = parsed.fieldValues[k];
              populatedFields[k] = v !== null && v !== undefined ? String(v) : '';
            });
          }
          setFieldValues(populatedFields);

          const rawRows = Array.isArray(parsed.tableRows) ? parsed.tableRows : [];
          if (rawRows.length > 0) {
            const populatedRows = rawRows.map((row) => {
              const r: Record<string, string> = {};
              const rowObj = (row as Record<string, any>) || {};
              targetTemplate.tableFields.forEach((col) => {
                const v = rowObj[col.extractionKey] ?? rowObj[col.id];
                r[col.extractionKey] = v !== null && v !== undefined ? String(v) : '';
              });
              return r;
            });
            setTableRows(populatedRows);

          } else if (targetTemplate.hasTable && targetTemplate.tableFields.length > 0) {
            const emptyRow: Record<string, string> = {};
            targetTemplate.tableFields.forEach((col) => {
              emptyRow[col.extractionKey] = '';
            });
            setTableRows([emptyRow]);
          }
        } catch (e) {
          console.error('Failed to parse extractedJson:', e);
          setFieldValues(initialFields);
        }
      } else {
        // 4. Case: Manual entry
        if (params.isFlexible === 'true') {
          setIsFlexible(true);
          setFlexibleFields([
            { id: 'f_1', name: 'Part No', value: '' },
            { id: 'f_2', name: 'Date', value: getTodayString() },
            { id: 'f_3', name: 'Operator', value: '' },
          ]);
        } else {
          let targetTemplate: DataTemplate = DEFAULT_MONITORING_DETAILS_TEMPLATE;
          const targetTemplateId = params.templateId || DEFAULT_MONITORING_DETAILS_TEMPLATE.id;
          const foundTemplate = await templateRepository.getTemplateById(targetTemplateId);
          if (foundTemplate) targetTemplate = foundTemplate;
          setTemplate(targetTemplate);

          const initialFields: Record<string, string> = {};
          targetTemplate.fields.forEach((f) => {
            initialFields[f.extractionKey] = f.defaultValue || '';
          });
          setFieldValues(initialFields);
          if (targetTemplate.hasTable && targetTemplate.tableFields.length > 0) {
            const emptyRow: Record<string, string> = {};
            targetTemplate.tableFields.forEach((col) => {
              emptyRow[col.extractionKey] = '';
            });
            setTableRows([emptyRow]);
          }
        }
      }
    } catch (e) {
      console.error('Error loading data entry modal:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Flexible Mode Handlers ---
  const handleFlexibleFieldNameChange = (id: string, newName: string) => {
    setFlexibleFields((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  };

  const handleFlexibleFieldValueChange = (id: string, newVal: string) => {
    setFlexibleFields((prev) => prev.map((f) => (f.id === id ? { ...f, value: newVal } : f)));
  };

  const handleAddFlexibleField = () => {
    const newId = `flex_f_${Date.now()}`;
    setFlexibleFields((prev) => [...prev, { id: newId, name: `Field ${prev.length + 1}`, value: '' }]);
  };

  const handleDeleteFlexibleField = (id: string) => {
    setFlexibleFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddFlexibleTableColumn = () => {
    Alert.prompt
      ? Alert.prompt('Add Column', 'Enter new column name:', (name) => {
          if (!name || !name.trim()) return;
          const colName = name.trim();
          setFlexibleTableHeaders((prev) => [...prev, colName]);
          setFlexibleTableRows((prev) => prev.map((row) => [...row, '']));
        })
      : (() => {
          const colName = `Column ${flexibleTableHeaders.length + 1}`;
          setFlexibleTableHeaders((prev) => [...prev, colName]);
          setFlexibleTableRows((prev) => prev.map((row) => [...row, '']));
        })();
  };

  const handleRenameFlexibleColumn = (colIdx: number, newName: string) => {
    setFlexibleTableHeaders((prev) => {
      const copy = [...prev];
      copy[colIdx] = newName;
      return copy;
    });
  };

  const handleDeleteFlexibleColumn = (colIdx: number) => {
    setFlexibleTableHeaders((prev) => prev.filter((_, i) => i !== colIdx));
    setFlexibleTableRows((prev) => prev.map((row) => row.filter((_, i) => i !== colIdx)));
  };

  const handleAddFlexibleTableRow = () => {
    const emptyRow = flexibleTableHeaders.map(() => '');
    setFlexibleTableRows((prev) => [...prev, emptyRow]);
  };

  const handleFlexibleTableCellChange = (rIdx: number, cIdx: number, value: string) => {
    setFlexibleTableRows((prev) => {
      const copy = [...prev];
      const rowCopy = [...copy[rIdx]];
      rowCopy[cIdx] = value;
      copy[rIdx] = rowCopy;
      return copy;
    });
  };

  const handleDeleteFlexibleTableRow = (rIdx: number) => {
    setFlexibleTableRows((prev) => prev.filter((_, idx) => idx !== rIdx));
  };

  const handleEnableFlexibleTable = () => {
    setFlexibleTableHeaders(['Time / Item', 'Planned Qty', 'Actual Qty', 'Remarks']);
    setFlexibleTableRows([['', '', '', '']]);
  };

  const handleDeleteFlexibleTable = () => {
    Alert.alert('Remove Table', 'Are you sure you want to remove the table data from this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove Table',
        style: 'destructive',
        onPress: () => {
          setFlexibleTableHeaders([]);
          setFlexibleTableRows([]);
        },
      },
    ]);
  };

  // --- Template-Based Mode Handlers ---
  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleTableRowChange = (rowIndex: number, colKey: string, value: string) => {
    setTableRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = { ...copy[rowIndex], [colKey]: value };
      return copy;
    });
  };

  const handleAddTableRow = () => {
    const newRow: Record<string, string> = {};
    template.tableFields.forEach((col) => {
      newRow[col.extractionKey] = '';
    });
    setTableRows((prev) => [...prev, newRow]);
  };

  const handleDeleteTableRow = (rowIndex: number) => {
    setTableRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  // --- Save & Export Logic ---
  const buildRecordObject = (): Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'> => {
    if (isFlexible) {
      const valuesMap: Record<string, any> = {};
      flexibleFields.forEach((f) => {
        const cleanKey = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        valuesMap[cleanKey || f.name] = f.value;
      });

      return {
        templateId: 'flexible',
        templateName: flexibleTitle || 'Flexible Extraction',
        isFlexible: true,
        title: flexibleTitle,
        fieldValues: valuesMap,
        flexibleFields: flexibleFields.map((f) => ({ name: f.name, value: f.value })),
        tableTitle: flexibleTableHeaders.length > 0 ? flexibleTableTitle : undefined,
        tableHeaders: flexibleTableHeaders.length > 0 ? flexibleTableHeaders : undefined,
        tableRows: flexibleTableHeaders.length > 0 ? flexibleTableRows : [],
        rawTranscript: transcript || null,
        date: entryDate || getTodayString(),
      };
    }

    // Standard Template
    const processedFieldValues: Record<string, any> = {};
    template.fields.forEach((f) => {
      const raw = fieldValues[f.extractionKey];
      if (f.type === 'number') {
        const num = parseFloat(raw);
        processedFieldValues[f.extractionKey] = isNaN(num) ? raw || 0 : num;
      } else {
        processedFieldValues[f.extractionKey] = raw || '';
      }
    });

    const processedTableRows = tableRows.map((row) => {
      const r: Record<string, any> = {};
      template.tableFields.forEach((col) => {
        const raw = row[col.extractionKey];
        if (col.type === 'number') {
          const num = parseFloat(raw);
          r[col.extractionKey] = isNaN(num) ? raw || 0 : num;
        } else {
          r[col.extractionKey] = raw || '';
        }
      });
      return r;
    });

    return {
      templateId: template.id,
      templateName: template.name,
      fieldValues: processedFieldValues,
      tableRows: processedTableRows,
      rawTranscript: transcript || null,
      date: entryDate || getTodayString(),
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = buildRecordObject();

      if (isEditingExisting && existingRecordId) {
        await dataEntryRepository.updateDataEntry(existingRecordId, data);
        Alert.alert('Record Updated', `Successfully updated ${data.templateName}.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await dataEntryRepository.createDataEntry(data);
        Alert.alert('Record Saved', `Successfully saved ${data.templateName}.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save data entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!isFlexible) return;
    try {
      const templateName = flexibleTitle !== 'Flexible Voice Entry' ? flexibleTitle : 'Custom Voice Template';

      const fields: TemplateField[] = flexibleFields.map((f, i) => {
        const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `field_${i + 1}`;
        const isNum = !isNaN(Number(f.value)) && String(f.value).trim() !== '';
        return {
          id: `tf_${i}_${Date.now()}`,
          name: f.name,
          extractionKey: key,
          type: isNum ? 'number' : 'text',
        };
      });

      const tableFields: TemplateField[] = flexibleTableHeaders.map((h, i) => {
        const key = h.toLowerCase().replace(/[^a-z0-9]/g, '_') || `col_${i + 1}`;
        return {
          id: `tbl_f_${i}_${Date.now()}`,
          name: h,
          extractionKey: key,
          type: 'text',
        };
      });

      const newTemplate: DataTemplate = {
        id: `template_${Date.now()}`,
        name: templateName,
        description: `Created from flexible voice extraction on ${formatDateDisplay(entryDate)}`,
        isDefault: false,
        fields,
        hasTable: tableFields.length > 0,
        tableTitle: flexibleTableTitle || 'Repeated Entries',
        tableFields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await templateRepository.saveTemplate(newTemplate);
      Alert.alert(
        'Template Created! 🎉',
        `"${newTemplate.name}" has been saved with ${fields.length} fields${tableFields.length > 0 ? ` and a table with ${tableFields.length} columns` : ''}. You can now select it anytime from the template switcher.`,
        [{ text: 'Great!' }]
      );
    } catch (e: any) {
      Alert.alert('Template Save Failed', e?.message || 'Could not create template.');
    }
  };

  const handleSharePdf = async () => {
    try {
      const data = buildRecordObject();
      const tempRecord: DataEntryRecord = {
        ...data,
        id: existingRecordId || `entry_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create synthetic template for flexible mode
      const targetTemplate: DataTemplate = isFlexible
        ? {
            id: 'flexible',
            name: flexibleTitle || 'Flexible Extraction Report',
            fields: flexibleFields.map((f, i) => ({
              id: `f_${i}`,
              name: f.name,
              extractionKey: f.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `f_${i}`,
              type: 'text',
            })),
            hasTable: flexibleTableHeaders.length > 0,
            tableTitle: flexibleTableTitle,
            tableFields: flexibleTableHeaders.map((h, i) => ({
              id: `col_${i}`,
              name: h,
              extractionKey: h.toLowerCase().replace(/[^a-z0-9]/g, '_') || `col_${i}`,
              type: 'text',
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : template;

      await PdfGeneratorService.shareDataEntryPdf(tempRecord, targetTemplate);
    } catch (e: any) {
      Alert.alert('PDF Export Error', e?.message || 'Failed to generate and share PDF.');
    }
  };

  const handleDelete = async () => {
    if (!existingRecordId) return;
    Alert.alert('Delete Record', 'Are you sure you want to delete this data entry record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dataEntryRepository.deleteDataEntry(existingRecordId);
          router.back();
        },
      },
    ]);
  };

  // Compute table statistics
  const computeTemplateTableTotals = () => {
    const totals: Record<string, number> = {};
    template.tableFields.forEach((c) => {
      if (c.type === 'number') {
        totals[c.extractionKey] = tableRows.reduce((sum, row) => {
          const val = parseFloat(row[c.extractionKey]) || 0;
          return sum + val;
        }, 0);
      }
    });
    return totals;
  };

  const computeFlexibleTableTotals = () => {
    return flexibleTableHeaders.map((_, cIdx) => {
      let isNumeric = true;
      let sum = 0;
      let count = 0;
      flexibleTableRows.forEach((row) => {
        const valStr = row[cIdx]?.trim() || '';
        if (valStr !== '') {
          const n = Number(valStr);
          if (isNaN(n)) {
            isNumeric = false;
          } else {
            sum += n;
            count++;
          }
        }
      });
      return isNumeric && count > 0 ? sum : null;
    });
  };

  const templateTableTotals = !isFlexible ? computeTemplateTableTotals() : {};
  const flexibleTableTotals = isFlexible ? computeFlexibleTableTotals() : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dataColor} />
        <Text style={styles.loadingText}>Loading data entry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.templateBadge, isFlexible && styles.flexibleBadge]}>
            <Ionicons
              name={isFlexible ? 'sparkles' : 'grid'}
              size={14}
              color={COLORS.dataColor}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.templateBadgeText} numberOfLines={1}>
              {isFlexible ? flexibleTitle : template.name}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleSharePdf}>
            <Ionicons name="share-outline" size={20} color={COLORS.dataColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.saveHeaderText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Transcript Box */}
        {transcript !== '' && (
          <View style={styles.transcriptCard}>
            <TouchableOpacity
              style={styles.transcriptHeader}
              onPress={() => setShowTranscript(!showTranscript)}
            >
              <View style={styles.transcriptTitleRow}>
                <Ionicons name="mic" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                <Text style={styles.transcriptTitle}>Voice Dictation Transcript</Text>
              </View>
              <Ionicons
                name={showTranscript ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            {showTranscript && <Text style={styles.transcriptBody}>"{transcript}"</Text>}
          </View>
        )}

        {/* Date Row */}
        <View style={styles.dateRowCard}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.dataColor} style={{ marginRight: 8 }} />
            <Text style={styles.dateLabel}>Record Date:</Text>
          </View>
          <TextInput
            style={styles.dateInput}
            value={entryDate}
            onChangeText={setEntryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textSubtle}
          />
        </View>

        {/* ================= FLEXIBLE EXTRACTION UI ================= */}
        {isFlexible ? (
          <>
            {/* Title / Description Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.fieldLabel}>Entry Title</Text>
              <TextInput
                style={[styles.fieldInput, { fontWeight: '700', fontSize: 16 }]}
                value={flexibleTitle}
                onChangeText={setFlexibleTitle}
                placeholder="e.g. Part 1234 Production Log"
                placeholderTextColor={COLORS.textSubtle}
              />
            </View>

            {/* Direct Fields Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Direct Fields</Text>
                  <Text style={styles.sectionSubTitle}>
                    {flexibleFields.length} {flexibleFields.length === 1 ? 'Field' : 'Fields'} Discovered
                  </Text>
                </View>
                <TouchableOpacity style={styles.addFieldBtn} onPress={handleAddFlexibleField}>
                  <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.addFieldText}>Add Field</Text>
                </TouchableOpacity>
              </View>

              {flexibleFields.length === 0 ? (
                <View style={styles.emptyFieldsBox}>
                  <Text style={styles.emptyTableText}>No direct fields extracted. Tap "+ Add Field" above.</Text>
                </View>
              ) : (
                flexibleFields.map((field) => (
                  <View key={field.id} style={styles.flexibleFieldRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.flexibleInputMiniLabel}>Field Name</Text>
                      <TextInput
                        style={styles.flexibleFieldNameInput}
                        value={field.name}
                        onChangeText={(val) => handleFlexibleFieldNameChange(field.id || '', val)}
                        placeholder="Field Name (e.g. Part No)"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <View style={{ flex: 1.3, marginRight: 8 }}>
                      <Text style={styles.flexibleInputMiniLabel}>Extracted Value</Text>
                      <TextInput
                        style={styles.flexibleFieldValueInput}
                        value={String(field.value)}
                        onChangeText={(val) => handleFlexibleFieldValueChange(field.id || '', val)}
                        placeholder="Value (e.g. 1234)"
                        placeholderTextColor={COLORS.textSubtle}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.deleteFieldBtn}
                      onPress={() => handleDeleteFlexibleField(field.id || '')}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Detected Table Section */}
            <View style={styles.sectionCard}>
              <View style={styles.tableSectionHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="grid" size={16} color={COLORS.dataColor} style={{ marginRight: 6 }} />
                    <TextInput
                      style={[styles.sectionTitle, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingVertical: 2 }]}
                      value={flexibleTableTitle}
                      onChangeText={setFlexibleTableTitle}
                      placeholder="Table Title"
                      placeholderTextColor={COLORS.textSubtle}
                    />
                  </View>
                  <Text style={styles.sectionSubTitle}>
                    {flexibleTableHeaders.length > 0
                      ? `${flexibleTableHeaders.length} Columns • ${flexibleTableRows.length} Rows`
                      : 'No table detected'}
                  </Text>
                </View>

                {flexibleTableHeaders.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.tableMiniActionBtn} onPress={handleAddFlexibleTableColumn}>
                      <Ionicons name="add-circle-outline" size={14} color={COLORS.dataColor} style={{ marginRight: 3 }} />
                      <Text style={styles.tableMiniActionText}>+ Col</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addRowBtn} onPress={handleAddFlexibleTableRow}>
                      <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.addRowText}>+ Row</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addRowBtn} onPress={handleEnableFlexibleTable}>
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addRowText}>Add Table Data</Text>
                  </TouchableOpacity>
                )}
              </View>

              {flexibleTableHeaders.length > 0 && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={styles.tableWrapper}>
                      {/* Header Row */}
                      <View style={styles.tableHeaderRow}>
                        <View style={styles.colIndexHeader}>
                          <Text style={styles.tableHeaderColText}>#</Text>
                        </View>
                        {flexibleTableHeaders.map((colName, cIdx) => (
                          <View key={`flex_col_${cIdx}`} style={[styles.tableColHeader, { width: 130 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <TextInput
                                style={styles.flexibleColHeaderInput}
                                value={colName}
                                onChangeText={(val) => handleRenameFlexibleColumn(cIdx, val)}
                                placeholder="Col Name"
                                placeholderTextColor="rgba(255,255,255,0.6)"
                              />
                              {flexibleTableHeaders.length > 1 && (
                                <TouchableOpacity onPress={() => handleDeleteFlexibleColumn(cIdx)}>
                                  <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                        <View style={styles.colActionHeader}>
                          <Text style={styles.tableHeaderColText}>Act</Text>
                        </View>
                      </View>

                      {/* Data Rows */}
                      {flexibleTableRows.length === 0 ? (
                        <View style={styles.emptyTableBox}>
                          <Text style={styles.emptyTableText}>No rows. Tap "+ Row" above.</Text>
                        </View>
                      ) : (
                        flexibleTableRows.map((row, rIdx) => (
                          <View
                            key={`flex_row_${rIdx}`}
                            style={[styles.tableDataRow, rIdx % 2 === 1 && styles.tableDataRowAlt]}
                          >
                            <View style={styles.colIndexCell}>
                              <Text style={styles.colIndexText}>{rIdx + 1}</Text>
                            </View>
                            {flexibleTableHeaders.map((_, cIdx) => (
                              <View key={`flex_cell_${rIdx}_${cIdx}`} style={[styles.tableColCell, { width: 130 }]}>
                                <TextInput
                                  style={styles.tableCellInput}
                                  value={row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                                  onChangeText={(val) => handleFlexibleTableCellChange(rIdx, cIdx, val)}
                                  placeholder="-"
                                  placeholderTextColor={COLORS.textSubtle}
                                />
                              </View>
                            ))}
                            <View style={styles.colActionCell}>
                              <TouchableOpacity
                                style={styles.deleteRowBtn}
                                onPress={() => handleDeleteFlexibleTableRow(rIdx)}
                              >
                                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}

                      {/* Totals Row */}
                      {flexibleTableRows.length > 0 && (
                        <View style={styles.tableTotalsRow}>
                          <View style={styles.colIndexCell}>
                            <Text style={styles.totalsLabel}>Σ</Text>
                          </View>
                          {flexibleTableHeaders.map((_, cIdx) => {
                            const total = flexibleTableTotals[cIdx];
                            return (
                              <View key={`flex_tot_${cIdx}`} style={[styles.tableColCell, { width: 130 }]}>
                                {total !== null && total !== undefined ? (
                                  <Text style={styles.totalValueText}>{total}</Text>
                                ) : cIdx === 0 ? (
                                  <Text style={styles.totalsLabel}>TOTALS</Text>
                                ) : (
                                  <Text style={styles.emptyTotalText}>-</Text>
                                )}
                              </View>
                            );
                          })}
                          <View style={styles.colActionCell} />
                        </View>
                      )}
                    </View>
                  </ScrollView>

                  <TouchableOpacity style={styles.removeTableBtn} onPress={handleDeleteFlexibleTable}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
                    <Text style={styles.removeTableText}>Remove Table</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Save As Template Helper */}
            <TouchableOpacity style={styles.saveAsTemplateBanner} onPress={handleSaveAsTemplate}>
              <View style={styles.saveAsTemplateIconBox}>
                <Ionicons name="layers" size={20} color={COLORS.dataColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.saveAsTemplateTitle}>Save Schema as Reusable Template</Text>
                <Text style={styles.saveAsTemplateSub}>
                  Turn these {flexibleFields.length} fields & table into a template you can reuse anytime.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.dataColor} />
            </TouchableOpacity>
          </>
        ) : (
          /* ================= TEMPLATE-BASED EXTRACTION UI ================= */
          <>
            {/* Top-Level Fields Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Specifications & General Metrics</Text>
                <Text style={styles.sectionCount}>{template.fields.length} Fields</Text>
              </View>

              <View style={styles.fieldsGrid}>
                {template.fields.map((field) => (
                  <View key={field.id || field.extractionKey} style={styles.fieldItem}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>{field.name}</Text>
                      <Text style={styles.fieldKeyBadge}>{field.extractionKey}</Text>
                    </View>
                    <TextInput
                      style={styles.fieldInput}
                      value={fieldValues[field.extractionKey] || ''}
                      onChangeText={(val) => handleFieldChange(field.extractionKey, val)}
                      placeholder={field.placeholder || `Enter ${field.name}`}
                      placeholderTextColor={COLORS.textSubtle}
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Repeated Entries Table Section */}
            {template.hasTable && template.tableFields && template.tableFields.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.tableSectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>{template.tableTitle || 'Repeated Entries'}</Text>
                    <Text style={styles.sectionSubTitle}>
                      {tableRows.length} {tableRows.length === 1 ? 'Entry Logged' : 'Entries Logged'}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.addRowBtn} onPress={handleAddTableRow}>
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addRowText}>Add Row</Text>
                  </TouchableOpacity>
                </View>

                {/* Table Matrix */}
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.tableWrapper}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <View style={styles.colIndexHeader}>
                        <Text style={styles.tableHeaderColText}>#</Text>
                      </View>
                      {template.tableFields.map((col) => (
                        <View
                          key={col.id || col.extractionKey}
                          style={[styles.tableColHeader, { width: getColWidth(col) }]}
                        >
                          <Text style={styles.tableHeaderColText}>{col.name}</Text>
                          <Text style={styles.tableHeaderKeyText}>{col.extractionKey}</Text>
                        </View>
                      ))}
                      <View style={styles.colActionHeader}>
                        <Text style={styles.tableHeaderColText}>Act</Text>
                      </View>
                    </View>

                    {/* Table Data Rows */}
                    {tableRows.length === 0 ? (
                      <View style={styles.emptyTableBox}>
                        <Text style={styles.emptyTableText}>No repeated entries. Tap "+ Add Row" above.</Text>
                      </View>
                    ) : (
                      tableRows.map((row, rIdx) => (
                        <View
                          key={`row_${rIdx}`}
                          style={[styles.tableDataRow, rIdx % 2 === 1 && styles.tableDataRowAlt]}
                        >
                          <View style={styles.colIndexCell}>
                            <Text style={styles.colIndexText}>{rIdx + 1}</Text>
                          </View>
                          {template.tableFields.map((col) => (
                            <View
                              key={`cell_${rIdx}_${col.extractionKey}`}
                              style={[styles.tableColCell, { width: getColWidth(col) }]}
                            >
                              <TextInput
                                style={[
                                  styles.tableCellInput,
                                  col.type === 'number' && styles.tableCellInputNumeric,
                                ]}
                                value={row[col.extractionKey] || ''}
                                onChangeText={(val) => handleTableRowChange(rIdx, col.extractionKey, val)}
                                placeholder={col.placeholder || '-'}
                                placeholderTextColor={COLORS.textSubtle}
                                keyboardType={col.type === 'number' ? 'numeric' : 'default'}
                              />
                            </View>
                          ))}
                          <View style={styles.colActionCell}>
                            <TouchableOpacity
                              style={styles.deleteRowBtn}
                              onPress={() => handleDeleteTableRow(rIdx)}
                            >
                              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Table Totals Row */}
                    {tableRows.length > 0 && (
                      <View style={styles.tableTotalsRow}>
                        <View style={styles.colIndexCell}>
                          <Text style={styles.totalsLabel}>Σ</Text>
                        </View>
                        {template.tableFields.map((col, cIdx) => (
                          <View
                            key={`total_${col.extractionKey}`}
                            style={[styles.tableColCell, { width: getColWidth(col) }]}
                          >
                            {col.type === 'number' ? (
                              <Text style={styles.totalValueText}>
                                {templateTableTotals[col.extractionKey] || 0}
                              </Text>
                            ) : cIdx === 0 ? (
                              <Text style={styles.totalsLabel}>TOTALS</Text>
                            ) : (
                              <Text style={styles.emptyTotalText}>-</Text>
                            )}
                          </View>
                        ))}
                        <View style={styles.colActionCell} />
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Quick Metrics Summary */}
                {tableRows.length > 0 &&
                  templateTableTotals['planned_qty'] !== undefined &&
                  templateTableTotals['produced_qty'] !== undefined && (
                    <View style={styles.metricsSummaryCard}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Planned</Text>
                        <Text style={styles.metricVal}>{templateTableTotals['planned_qty'] || 0}</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Produced</Text>
                        <Text style={[styles.metricVal, { color: COLORS.success }]}>
                          {templateTableTotals['produced_qty'] || 0}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Rejection</Text>
                        <Text style={[styles.metricVal, { color: COLORS.danger }]}>
                          {templateTableTotals['rejection'] || 0}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Efficiency</Text>
                        <Text style={[styles.metricVal, { color: COLORS.dataColor }]}>
                          {templateTableTotals['planned_qty'] > 0
                            ? `${Math.round(
                                ((templateTableTotals['produced_qty'] || 0) /
                                  templateTableTotals['planned_qty']) *
                                  100
                              )}%`
                            : '100%'}
                        </Text>
                      </View>
                    </View>
                  )}
              </View>
            )}
          </>
        )}

        {/* Actions Footer */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.primarySaveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primarySaveText}>{saving ? 'Saving...' : 'Save Data Record'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pdfShareBtn} onPress={handleSharePdf}>
            <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.pdfShareText}>Export & Share PDF</Text>
          </TouchableOpacity>

          {isEditingExisting && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.deleteText}>Delete Record</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Helper to determine column width based on field type and name
function getColWidth(col: { name: string; type: string }): number {
  if (col.type === 'time') return 110;
  if (col.type === 'number') return 110;
  if (col.name.toLowerCase().includes('remark')) return 160;
  return 130;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  flexibleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: COLORS.dataColor,
  },
  templateBadgeText: {
    color: COLORS.dataColor,
    fontSize: 13,
    fontWeight: '800',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  saveHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  transcriptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  transcriptBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  dateRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dataColor,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addFieldText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyFieldsBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexibleFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  flexibleInputMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  flexibleFieldNameInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  flexibleFieldValueInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  deleteFieldBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  fieldsGrid: {
    gap: 12,
  },
  fieldItem: {
    marginBottom: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  fieldKeyBadge: {
    fontSize: 10,
    color: COLORS.textSubtle,
    fontFamily: 'monospace',
  },
  fieldInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tableSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tableMiniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  tableMiniActionText: {
    color: COLORS.dataColor,
    fontSize: 11,
    fontWeight: '700',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dataColor,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addRowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tableWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  colIndexHeader: {
    width: 36,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
  },
  tableColHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
  },
  flexibleColHeaderInput: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    paddingVertical: 2,
  },
  tableHeaderColText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  tableHeaderKeyText: {
    color: COLORS.textSubtle,
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  colActionHeader: {
    width: 44,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
  },
  emptyTableText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tableDataRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  colIndexCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
  },
  colIndexText: {
    color: COLORS.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  tableColCell: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
    justifyContent: 'center',
  },
  tableCellInput: {
    color: COLORS.text,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
  },
  tableCellInputNumeric: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  colActionCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRowBtn: {
    padding: 6,
  },
  tableTotalsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderTopWidth: 1,
    borderTopColor: COLORS.dataColor,
  },
  totalsLabel: {
    color: COLORS.dataColor,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  totalValueText: {
    color: COLORS.dataColor,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    paddingRight: 6,
  },
  emptyTotalText: {
    color: COLORS.textSubtle,
    fontSize: 12,
    textAlign: 'center',
  },
  removeTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  removeTableText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  saveAsTemplateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  saveAsTemplateIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saveAsTemplateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  saveAsTemplateSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricsSummaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.cardBorder,
  },
  footerActions: {
    gap: 10,
    marginTop: 10,
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dataColor,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primarySaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pdfShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  pdfShareText: {
    color: COLORS.dataColor,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
