'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Save,
  Printer,
  Download,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Pill,
  Calendar,
  Phone,
  User,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { DoctorPrescription, PrescriptionMedicine, DataTemplate } from '@/types';
import { useWebAudioRecorder } from '@/hooks/useWebAudioRecorder';
import { getTodayString, formatDateDisplay, normalizeDateToDDMMYYYY } from '@/lib/utils/dateUtils';
import { DOCTOR_PRESCRIPTION_TEMPLATE } from '@/lib/constants';
import { DoctorPrescriptionPreview } from '@/components/prescription/DoctorPrescriptionPreview';
import { PrescriptionActiveView } from '@/components/prescription/PrescriptionActiveView';
import { PrescriptionRecordingPanel } from '@/components/prescription/PrescriptionRecordingPanel';
import { WhatsAppModal } from '@/components/prescription/WhatsAppModal';
import { TemplateEditModal } from '@/components/modals/TemplateEditModal';
import { TemplateManagerModal } from '@/components/modals/TemplateManagerModal';

export default function DoctorPrescriptionPage() {
  // 1. Active Template State
  const [templates, setTemplates] = useState<DataTemplate[]>([DOCTOR_PRESCRIPTION_TEMPLATE]);
  const [activeTemplate, setActiveTemplate] = useState<DataTemplate>(DOCTOR_PRESCRIPTION_TEMPLATE);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTemplateEdit, setShowTemplateEdit] = useState(false);

  // 2. Prescription Form State (Starts completely empty - no sample or dummy data)
  const [prescription, setPrescription] = useState<Partial<DoctorPrescription>>({
    patientName: '',
    age: '',
    phone: '',
    email: '',
    date: '',
    doctorName: '',
    doctorSpecialty: '',
    doctorRegNo: '',
    clinicDetails: '',
    diagnosis: '',
    notes: '',
    medicines: [],
  });

  // 3. Voice Recording & AI Extraction State (Right Panel)
  const recorder = useWebAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  // 4. Action / Notification States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // 5. Database History State
  const [savedPrescriptions, setSavedPrescriptions] = useState<DoctorPrescription[]>([]);
  const [search, setSearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch templates and prescriptions
  const fetchTemplatesAndRecords = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const [tmplRes, rxRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/prescriptions'),
      ]);
      const tmplData = await tmplRes.json();
      const rxData = await rxRes.json();

      if (Array.isArray(tmplData) && tmplData.length > 0) {
        setTemplates(tmplData);
        const rxTmpl = tmplData.find(
          (t: DataTemplate) =>
            t.id === DOCTOR_PRESCRIPTION_TEMPLATE.id ||
            t.name.toLowerCase().includes('prescription')
        );
        if (rxTmpl) {
          setActiveTemplate(rxTmpl);
        }
      }
      if (Array.isArray(rxData)) {
        setSavedPrescriptions(rxData);
      }
    } catch (e) {
      console.error('Failed to load templates or prescriptions:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplatesAndRecords();
  }, [fetchTemplatesAndRecords]);

  // Audio processing (Microphone recording or Uploaded audio file)
  const processAudioInput = async (blob: Blob | File, filename: string = 'recording.webm') => {
    try {
      setIsProcessing(true);
      recorder.setState('Transcribing');
      setProcessingStatus('Transcribing speech with Whisper AI...');

      const formData = new FormData();
      formData.append('file', blob, filename);

      const transcribeRes = await fetch('/api/groq/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Audio transcription failed.');
      }

      const { text } = await transcribeRes.json();
      setLastTranscript(text);
      recorder.setState('Understanding');
      setProcessingStatus('Extracting prescription fields with Medical AI...');

      await extractFromText(text);
      recorder.setState('Ready');
    } catch (err: any) {
      console.error('Prescription Voice Processing Error:', err);
      recorder.setErrorMessage(err.message || 'Processing failed. Please try again.');
      recorder.setState('Error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Text & Transcription Entity Extraction
  const extractFromText = async (text: string) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Extracting prescription entities with Medical AI...');

      const res = await fetch('/api/groq/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Medical extraction failed.');
      }

      const data = await res.json();

      // Populate ONLY the fields that were actually detected/spoken
      setPrescription((prev) => {
        const updatedMeds: PrescriptionMedicine[] = (data.medicines || []).map(
          (m: any, idx: number) => ({
            id: `med_${Date.now()}_${idx}`,
            name: m.name || '',
            dosage: m.dosage || '',
            timing: m.timing || 'AF',
            frequency: m.frequency || '',
            duration: m.duration || '',
            instructions: m.instructions || '',
          })
        );

        return {
          ...prev,
          patientName: data.patient_name || prev.patientName || '',
          age: data.age || prev.age || '',
          gender: data.gender || prev.gender || '',
          phone: data.phone || prev.phone || '',
          email: data.email || prev.email || '',
          date: data.date ? normalizeDateToDDMMYYYY(data.date) : (prev.date || getTodayString()),
          doctorName: data.doctor_name || prev.doctorName || '',
          doctorSpecialty: data.doctor_specialty || prev.doctorSpecialty || '',
          clinicDetails: data.clinic_details || prev.clinicDetails || '',
          diagnosis: data.diagnosis || prev.diagnosis || '',
          notes: data.notes || prev.notes || '',
          medicines: updatedMeds.length > 0 ? updatedMeds : prev.medicines,
          rawTranscript: text,
        };
      });

      setSaveSuccessMsg('✓ Extracted prescription fields and medicine table from voice/text!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Extraction error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Mic Press Handler
  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const blob = await recorder.stopRecording();
      if (!blob) return;
      await processAudioInput(blob, 'recording.webm');
    } else {
      await recorder.startRecording();
    }
  };

  // Upload Audio Handler
  const handleUploadAudio = async (file: File) => {
    if (!file) return;
    if (recorder.state === 'Recording') {
      await recorder.stopRecording();
    }
    await processAudioInput(file, file.name);
  };

  // Field updates from active form
  const handleUpdateField = (key: string, value: any) => {
    setPrescription((prev) => ({
      ...prev,
      [key]: value,
      // Alias mappings
      ...(key === 'patient_name' ? { patientName: value } : {}),
      ...(key === 'doctor_name' ? { doctorName: value } : {}),
      ...(key === 'phone_number' ? { phone: value } : {}),
      ...(key === 'clinic_details' ? { clinicDetails: value } : {}),
    }));
  };

  // Medicine table updates
  const handleUpdateMedicine = (
    index: number,
    key: keyof PrescriptionMedicine,
    value: any
  ) => {
    const meds = [...(prescription.medicines || [])];
    if (meds[index]) {
      meds[index] = { ...meds[index], [key]: value };
      setPrescription((prev) => ({ ...prev, medicines: meds }));
    }
  };

  const handleAddMedicine = () => {
    const newMed: PrescriptionMedicine = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      dosage: '',
      timing: 'AF',
      frequency: '',
      duration: '',
      instructions: '',
    };
    setPrescription((prev) => ({
      ...prev,
      medicines: [...(prev.medicines || []), newMed],
    }));
  };

  const handleDeleteMedicine = (index: number) => {
    setPrescription((prev) => ({
      ...prev,
      medicines: (prev.medicines || []).filter((_, i) => i !== index),
    }));
  };

  const handleToggleTiming = (index: number) => {
    const meds = [...(prescription.medicines || [])];
    if (meds[index]) {
      const nextTiming = meds[index].timing === 'BF' ? 'AF' : 'BF';
      meds[index] = { ...meds[index], timing: nextTiming };
      setPrescription((prev) => ({ ...prev, medicines: meds }));
    }
  };

  // Clear Form
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all current prescription fields?')) {
      setPrescription({
        patientName: '',
        age: '',
        phone: '',
        email: '',
        date: '',
        doctorName: '',
        doctorSpecialty: '',
        doctorRegNo: '',
        clinicDetails: '',
        diagnosis: '',
        notes: '',
        medicines: [],
      });
      setLastTranscript(null);
      setSaveSuccessMsg(null);
    }
  };

  // Save Prescription to Database
  const handleSave = async () => {
    if (!prescription.patientName?.trim()) {
      alert('Please enter a Patient Name before saving.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescription),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save prescription.');
      }

      const savedDoc: DoctorPrescription = await res.json();
      setPrescription(savedDoc);
      setSaveSuccessMsg(
        `✓ Successfully saved Prescription ${savedDoc.prescriptionNumber} for ${savedDoc.patientName}!`
      );
      fetchTemplatesAndRecords();
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Print & PDF
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // Send via Email
  const handleSendEmail = async () => {
    const email = prescription.email?.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid Patient Email Address before sending via email.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setEmailSuccessMsg(null);

      const res = await fetch('/api/prescriptions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescription,
          recipientEmail: email,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send email.');
      }

      setEmailSuccessMsg(`✓ Prescription successfully dispatched to ${email}!`);
      setTimeout(() => setEmailSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Email failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Send to WhatsApp
  const handleOpenWhatsApp = () => {
    const phone = prescription.phone?.trim();
    if (!phone) {
      alert('Please enter a Patient Phone Number before sending to WhatsApp.');
      return;
    }
    setShowWhatsAppModal(true);
  };

  // Load a past saved record
  const handleLoadPastPrescription = (saved: DoctorPrescription) => {
    setPrescription({ ...saved });
    setSaveSuccessMsg(
      `✓ Loaded saved prescription ${saved.prescriptionNumber} for ${saved.patientName}!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete past saved record
  const handleDeleteSavedRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved prescription?')) return;
    await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
    fetchTemplatesAndRecords();
  };

  // Filter saved records
  const filteredHistory = savedPrescriptions.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesName = (r.patientName || '').toLowerCase().includes(q);
    const matchesPhone = (r.phone || '').toLowerCase().includes(q);
    const matchesDoctor = (r.doctorName || '').toLowerCase().includes(q);
    const matchesRx = (r.prescriptionNumber || '').toLowerCase().includes(q);
    const matchesDiag = (r.diagnosis || '').toLowerCase().includes(q);
    const matchesMed = (r.medicines || []).some((m) => m.name.toLowerCase().includes(q));
    return matchesName || matchesPhone || matchesDoctor || matchesRx || matchesDiag || matchesMed;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Printable Prescription Document (hidden on screen, visible only when printing) */}
      <div className="print-only">
        <DoctorPrescriptionPreview prescription={prescription} />
      </div>

      {/* 1. SCREEN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
            Doctor Prescription Studio
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Two-panel voice dictation: dictations populate prescription fields and medicine table on the left. Review, edit, and Save/Print/Export.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          {/* Edit Template Option */}
          <button
            onClick={() => setShowTemplateEdit(true)}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Customize fields in this prescription template"
          >
            <Edit3 className="w-3.5 h-3.5 text-teal-400" />
            <span>Edit Template</span>
          </button>

          {/* Template Manager */}
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-dataColor" />
            <span>Templates ({templates.length})</span>
          </button>

          {/* History Button */}
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>History ({savedPrescriptions.length})</span>
          </button>
        </div>
      </div>

      {/* 2. SUCCESS / NOTIFICATION BANNERS */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg no-print animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-textMuted hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {emailSuccessMsg && (
        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-between shadow-lg no-print animate-fade-in">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{emailSuccessMsg}</span>
          </div>
          <button
            onClick={() => setEmailSuccessMsg(null)}
            className="text-xs text-textMuted hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. TWO-PANEL STUDIO LAYOUT (Left Panel: Form & Table | Right Panel: Voice Recording Console) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        {/* LEFT PANEL (Extracted Data Entries Stack & Actions - 7 cols) */}
        <div className="lg:col-span-7 h-full">
          <PrescriptionActiveView
            prescription={prescription}
            activeTemplate={activeTemplate}
            isSaving={isSaving}
            onUpdateField={handleUpdateField}
            onUpdateMedicine={handleUpdateMedicine}
            onAddMedicine={handleAddMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            onToggleTiming={handleToggleTiming}
            onSave={handleSave}
            onPrint={handlePrint}
            onDownloadPDF={handleDownloadPDF}
            onSendEmail={handleSendEmail}
            onSendWhatsApp={handleOpenWhatsApp}
            onClear={handleClear}
          />
        </div>

        {/* RIGHT PANEL (Recording Console, Audio Player & Transcription - 5 cols) */}
        <div className="lg:col-span-5 h-full">
          <PrescriptionRecordingPanel
            activeTemplate={activeTemplate}
            onEditTemplate={() => setShowTemplateEdit(true)}
            recordingState={recorder.state}
            durationSeconds={recorder.durationSeconds}
            volumeLevel={recorder.volumeLevel}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            errorMessage={recorder.errorMessage}
            lastTranscript={lastTranscript}
            onMicPress={handleMicPress}
            onUploadAudio={handleUploadAudio}
            onExtractText={extractFromText}
          />
        </div>
      </div>

      {/* 4. SAVED DATABASE PRESCRIPTIONS HISTORY ACCORDION */}
      <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl no-print">
        <div
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm sm:text-base font-bold text-text">
              Saved Prescriptions Database ({filteredHistory.length})
            </h2>
            <span className="text-xs text-textSubtle hidden sm:inline">
              (Stored clinical records in database)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-teal-400 font-semibold">
              {showHistory ? 'Hide History' : 'Show History'}
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-textSubtle" />
            ) : (
              <ChevronDown className="w-4 h-4 text-textSubtle" />
            )}
          </div>
        </div>

        {showHistory && (
          <div className="mt-4 pt-4 border-t border-cardBorder space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 text-textSubtle absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name, phone, doctor, Rx number, or medicine..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Prescriptions Grid */}
            {filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-textMuted bg-background/50 rounded-xl border border-cardBorder p-4">
                No saved prescriptions found. Dictate or enter prescription above and click &quot;Save&quot;!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredHistory.map((rx) => (
                  <div
                    key={rx.id}
                    onClick={() => handleLoadPastPrescription(rx)}
                    className="p-4 rounded-xl bg-card border border-cardBorder hover:border-teal-500/50 transition-all space-y-3 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-cardBorder/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-teal-500 font-bold text-xs">
                            {rx.prescriptionNumber}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-text truncate">
                            {rx.patientName || 'Anonymous'}
                          </span>
                          {rx.age && (
                            <span className="text-[10px] text-textSubtle">({rx.age})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-textSubtle">
                          <span>{formatDateDisplay(rx.date)}</span>
                          {rx.doctorName && (
                            <>
                              <span>•</span>
                              <span>{rx.doctorName}</span>
                            </>
                          )}
                          {rx.phone && (
                            <>
                              <span>•</span>
                              <span>Ph: {rx.phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadPastPrescription(rx);
                          }}
                          className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-teal-400 hover:text-text transition cursor-pointer"
                          title="Load and View Prescription"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteSavedRecord(rx.id, e)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                          title="Delete Prescription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Diagnosis & Medicines preview */}
                    <div className="space-y-1 text-xs">
                      {rx.diagnosis && (
                        <div className="text-textMuted text-[11px] truncate">
                          <span className="font-semibold text-text">Diagnosis:</span> {rx.diagnosis}
                        </div>
                      )}
                      <div className="text-[11px] text-textSubtle truncate">
                        <span className="font-semibold text-text">
                          {rx.medicines?.length || 0} Medicines:
                        </span>{' '}
                        {(rx.medicines || []).map((m) => m.name).join(', ') || 'No medicines'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-cardBorder/60 flex items-center justify-between text-[11px] text-textSubtle">
                      <span className="flex items-center gap-1.5">
                        {rx.email && <Mail className="w-3 h-3 text-cyan-400" />}
                        {rx.phone && <Phone className="w-3 h-3 text-emerald-400" />}
                      </span>
                      <span className="text-teal-400 font-semibold group-hover:underline flex items-center gap-1">
                        <span>Load &amp; Edit</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. MODALS */}
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          prescription={prescription}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* Edit Template Modal */}
      {showTemplateEdit && (
        <TemplateEditModal
          template={activeTemplate}
          onClose={() => setShowTemplateEdit(false)}
          onSaved={() => {
            setShowTemplateEdit(false);
            fetchTemplatesAndRecords();
          }}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManagerModal
          activeTemplateId={activeTemplate.id}
          onSelectActive={(tmpl) => {
            setActiveTemplate(tmpl);
            setShowTemplateManager(false);
          }}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
}
