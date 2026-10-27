'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, CheckCircle2, AlertCircle, Info, X, PenLine, Database } from 'lucide-react';
import { DoctorPrescription, PrescriptionMedicine } from '@/types';
import { useWebAudioRecorder } from '@/hooks/useWebAudioRecorder';
import { getTodayString, normalizeDateToDDMMYYYY } from '@/lib/utils/dateUtils';
import { buildPrescriptionText } from '@/lib/utils/prescriptionText';
import { DoctorPrescriptionPreview } from '@/components/prescription/DoctorPrescriptionPreview';
import { PrescriptionActiveView } from '@/components/prescription/PrescriptionActiveView';
import { PrescriptionRecordingPanel } from '@/components/prescription/PrescriptionRecordingPanel';
import { PrescriptionHistory } from '@/components/prescription/PrescriptionHistory';
import { WhatsAppModal } from '@/components/prescription/WhatsAppModal';

type Notice = { kind: 'success' | 'error' | 'info'; text: string };

const blankPrescription = (): Partial<DoctorPrescription> => ({
  patientName: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  date: '',
  doctorName: '',
  doctorSpecialty: '',
  doctorRegNo: '',
  clinicDetails: '',
  clinicAddress: '',
  clinicPhone: '',
  diagnosis: '',
  notes: '',
  medicines: [],
});

const newMedicineId = () => `med_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const medicineKey = (m: Pick<PrescriptionMedicine, 'name' | 'dosage' | 'frequency'>) =>
  `${m.name}|${m.dosage}|${m.frequency}`.toLowerCase().replace(/\s+/g, ' ').trim();

export default function DoctorPrescriptionPage() {
  const [view, setView] = useState<'compose' | 'saved'>('compose');
  const [prescription, setPrescription] = useState<Partial<DoctorPrescription>>(blankPrescription);

  // Voice / AI
  const recorder = useWebAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Actions
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  // Saved records
  const [saved, setSaved] = useState<DoctorPrescription[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const showNotice = useCallback((kind: Notice['kind'], text: string, ms = 5000) => {
    setNotice({ kind, text });
    if (ms > 0) setTimeout(() => setNotice((cur) => (cur?.text === text ? null : cur)), ms);
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/prescriptions');
      const data = await res.json();
      if (Array.isArray(data)) setSaved(data);
    } catch (e) {
      console.error('Failed to load prescriptions:', e);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
    // Set the date on the client only, so it can't mismatch the server-rendered HTML.
    setPrescription((prev) => (prev.date ? prev : { ...prev, date: getTodayString() }));
  }, [fetchSaved]);

  const hasContent = Boolean(
    prescription.patientName ||
      prescription.phone ||
      prescription.email ||
      prescription.doctorName ||
      prescription.diagnosis ||
      prescription.notes ||
      (prescription.medicines || []).length > 0
  );

  /* ---------------- AI extraction ---------------- */

  /** Sends text to the extraction API and merges the result into the form. Throws on failure. */
  const extractFromText = async (text: string) => {
    setProcessingStatus('Reading the prescription details…');

    const res = await fetch('/api/groq/prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not extract prescription details.');
    }
    const data = await res.json();

    const incoming: PrescriptionMedicine[] = (data.medicines || [])
      .filter((m: any) => m && m.name)
      .map((m: any) => ({
        id: newMedicineId(),
        name: m.name || '',
        dosage: m.dosage || '',
        timing: m.timing === 'BF' ? 'BF' : 'AF',
        frequency: m.frequency || '',
        duration: m.duration || '',
        instructions: m.instructions || '',
      }));

    // The API always returns a date (today when none was spoken); only trust it when it differs.
    const spokenDate =
      data.date && normalizeDateToDDMMYYYY(data.date) !== getTodayString()
        ? normalizeDateToDDMMYYYY(data.date)
        : '';

    setPrescription((prev) => {
      const existing = prev.medicines || [];
      const seen = new Set(existing.map(medicineKey));
      const added = incoming.filter((m) => !seen.has(medicineKey(m)));

      return {
        ...prev,
        patientName: data.patient_name || prev.patientName || '',
        age: data.age || prev.age || '',
        gender: data.gender || prev.gender || '',
        phone: data.phone || prev.phone || '',
        email: data.email || prev.email || '',
        date: spokenDate || prev.date || getTodayString(),
        doctorName: data.doctor_name || prev.doctorName || '',
        doctorSpecialty: data.doctor_specialty || prev.doctorSpecialty || '',
        clinicDetails: data.clinic_details || prev.clinicDetails || '',
        diagnosis: data.diagnosis || prev.diagnosis || '',
        notes: data.notes || prev.notes || '',
        medicines: [...existing, ...added],
        rawTranscript: prev.rawTranscript ? `${prev.rawTranscript}\n${text}` : text,
      };
    });

    const n = incoming.length;
    showNotice(
      'success',
      n > 0
        ? `Filled the form — ${n} medicine${n === 1 ? '' : 's'} found. Please review before saving.`
        : 'Filled the form. No medicines were detected — add them below.'
    );
  };

  /** Wraps extraction with busy/error state, for typed text. */
  const handleExtractText = async (text: string) => {
    setIsProcessing(true);
    setExtractError(null);
    try {
      await extractFromText(text);
    } catch (err: any) {
      setExtractError(err.message || 'Extraction failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const processAudio = async (blob: Blob | File, filename: string) => {
    setIsProcessing(true);
    setExtractError(null);
    recorder.setErrorMessage(null);
    try {
      recorder.setState('Transcribing');
      setProcessingStatus('Transcribing speech…');

      const body = new FormData();
      body.append('file', blob, filename);
      const res = await fetch('/api/groq/transcribe', { method: 'POST', body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Audio transcription failed.');
      }
      const { text } = await res.json();
      if (!text || !String(text).trim()) {
        throw new Error('No speech was detected in that audio. Please try again and speak closer to the mic.');
      }
      setLastTranscript(text);

      recorder.setState('Understanding');
      await extractFromText(text);
      recorder.setState('Ready');
    } catch (err: any) {
      console.error('Prescription voice processing error:', err);
      setExtractError(err.message || 'Processing failed. Please try again.');
      recorder.setState('Ready');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const blob = await recorder.stopRecording();
      if (blob) await processAudio(blob, 'recording.webm');
    } else {
      setExtractError(null);
      await recorder.startRecording();
    }
  };

  const handleUploadAudio = async (file: File) => {
    if (recorder.state === 'Recording') await recorder.stopRecording();
    await processAudio(file, file.name);
  };

  /* ---------------- Form editing ---------------- */

  const handleUpdateField = (key: keyof DoctorPrescription, value: string) =>
    setPrescription((prev) => ({ ...prev, [key]: value }));

  const handleUpdateMedicine = (index: number, key: keyof PrescriptionMedicine, value: string) =>
    setPrescription((prev) => ({
      ...prev,
      medicines: (prev.medicines || []).map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    }));

  const handleAddMedicine = () =>
    setPrescription((prev) => ({
      ...prev,
      medicines: [
        ...(prev.medicines || []),
        { id: newMedicineId(), name: '', dosage: '', timing: 'AF', frequency: '', duration: '', instructions: '' },
      ],
    }));

  const handleDeleteMedicine = (index: number) =>
    setPrescription((prev) => ({
      ...prev,
      medicines: (prev.medicines || []).filter((_, i) => i !== index),
    }));

  const handleNew = () => {
    if (hasContent && !confirm('Start a new prescription? Anything not saved will be lost.')) return;
    setPrescription({ ...blankPrescription(), date: getTodayString() });
    setLastTranscript(null);
    setExtractError(null);
    recorder.resetRecorder();
    setNotice(null);
  };

  /* ---------------- Save / send ---------------- */

  const handleSave = async () => {
    if (!prescription.patientName?.trim()) {
      showNotice('error', 'Enter the patient name before saving.');
      return;
    }
    const meds = (prescription.medicines || []).filter((m) => m.name.trim());
    const payload = { ...prescription, medicines: meds };

    try {
      setIsSaving(true);
      const isUpdate = Boolean(prescription.id);
      const res = await fetch(isUpdate ? `/api/prescriptions/${prescription.id}` : '/api/prescriptions', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save prescription.');
      }
      const doc: DoctorPrescription = await res.json();
      setPrescription(doc);
      showNotice('success', `${isUpdate ? 'Updated' : 'Saved'} ${doc.prescriptionNumber} for ${doc.patientName}.`);
      fetchSaved();
    } catch (err: any) {
      showNotice('error', `Save failed: ${err.message || 'Unknown error'}`, 8000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    const email = prescription.email?.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showNotice('error', 'Enter a valid patient email address first.');
      return;
    }

    try {
      setIsSendingEmail(true);
      const res = await fetch('/api/prescriptions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescription, recipientEmail: email }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 501 && body.notConfigured) {
        // No mail provider on the server: hand over to the user's own mail app instead.
        const subject = `Prescription ${prescription.prescriptionNumber || ''} - ${prescription.patientName || ''}`.trim();
        const text = buildPrescriptionText(prescription).replace(/\*/g, '');
        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(text)}`;
        showNotice('info', 'Server email isn’t set up, so your mail app was opened with the prescription text.', 8000);
        return;
      }
      if (!res.ok) throw new Error(body.error || 'Failed to send email.');
      showNotice('success', `Prescription emailed to ${email}.`);
    } catch (err: any) {
      showNotice('error', `Email failed: ${err.message || 'Unknown error'}`, 8000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenSaved = (rx: DoctorPrescription) => {
    setPrescription({ ...rx });
    setLastTranscript(null);
    setExtractError(null);
    setView('compose');
    showNotice('info', `Opened ${rx.prescriptionNumber} for ${rx.patientName}.`, 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSaved = async (rx: DoctorPrescription) => {
    if (!confirm(`Delete prescription ${rx.prescriptionNumber} for ${rx.patientName}?`)) return;
    try {
      const res = await fetch(`/api/prescriptions/${rx.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      if (prescription.id === rx.id) {
        // The open form is now an unsaved copy.
        setPrescription((prev) => ({ ...prev, id: undefined, prescriptionNumber: undefined }));
      }
      fetchSaved();
    } catch (err: any) {
      showNotice('error', err.message || 'Could not delete that prescription.');
    }
  };

  const noticeStyle: Record<Notice['kind'], { box: string; icon: React.ReactNode }> = {
    success: {
      box: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    },
    error: {
      box: 'bg-danger/10 border-danger/40 text-danger',
      icon: <AlertCircle className="w-4 h-4 shrink-0" />,
    },
    info: {
      box: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
      icon: <Info className="w-4 h-4 shrink-0" />,
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Printable document (hidden on screen) */}
      <div className="print-only">
        <DoctorPrescriptionPreview prescription={prescription} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />
            Voice Prescription
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Dictate the consultation, review the filled-in form, then save, print or send it.
          </p>
        </div>

        <div role="tablist" className="grid grid-cols-2 bg-surface p-1 rounded-xl border border-cardBorder text-xs sm:w-72">
          {(
            [
              { id: 'compose', label: 'Compose', icon: PenLine },
              { id: 'saved', label: `Saved (${saved.length})`, icon: Database },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                view === id
                  ? 'bg-card text-text shadow-sm border border-cardBorder'
                  : 'text-textMuted hover:text-text border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-teal-500" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 no-print ${noticeStyle[notice.kind].box}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {noticeStyle[notice.kind].icon}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {view === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start no-print">
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <PrescriptionRecordingPanel
              recordingState={recorder.state}
              durationSeconds={recorder.durationSeconds}
              volumeLevel={recorder.volumeLevel}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              errorMessage={extractError || recorder.errorMessage}
              lastTranscript={lastTranscript}
              onMicPress={handleMicPress}
              onUploadAudio={handleUploadAudio}
              onExtractText={handleExtractText}
            />
          </div>

          <div className="lg:col-span-7">
            <PrescriptionActiveView
              prescription={prescription}
              isSaving={isSaving}
              isSendingEmail={isSendingEmail}
              onUpdateField={handleUpdateField}
              onUpdateMedicine={handleUpdateMedicine}
              onAddMedicine={handleAddMedicine}
              onDeleteMedicine={handleDeleteMedicine}
              onSave={handleSave}
              onPrint={() => window.print()}
              onSendEmail={handleSendEmail}
              onSendWhatsApp={() => setShowWhatsApp(true)}
              onNew={handleNew}
            />
          </div>
        </div>
      ) : (
        <div className="no-print">
          <PrescriptionHistory
            records={saved}
            loading={loadingSaved}
            activeId={prescription.id}
            onOpen={handleOpenSaved}
            onDelete={handleDeleteSaved}
          />
        </div>
      )}

      {showWhatsApp && <WhatsAppModal prescription={prescription} onClose={() => setShowWhatsApp(false)} />}
    </div>
  );
}
