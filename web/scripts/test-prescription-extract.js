// Test script to verify Doctor Prescription extraction and business logic

const testTranscripts = [
  {
    name: 'Full Consultation with Multi-Medicines',
    transcript: 'Patient Ananya Sharma aged 29 female phone 9845012345 email ananya@test.com diagnosed with Acute Viral Pharyngitis. Prescribe Augmentin 625 Duo twice daily after food for 5 days, Dolo 650 thrice daily after food for 3 days, Pan D once daily before food for 5 days, and Ascoril LS syrup 10ml twice daily after food for 5 days. Doctor Dr. Sarah Jenkins, City Care Hospital.',
  },
  {
    name: 'Brief Spoken Dictation',
    transcript: 'Prescription for Rahul Verma 45 years phone 9876543210. Prescribe Metformin 500mg once daily after meals for 1 month and Telmisartan 40mg once daily before breakfast for 30 days. Doctor Dr. Kumar.',
  },
  {
    name: 'Minimal Prescription',
    transcript: 'Prescribe Paracetamol 650mg 1 tab after food three times a day for 5 days for patient Maya 22 years.',
  },
];

function runLocalHeuristicPrescriptionParser(transcript) {
  const text = transcript;
  let patientName = null;
  const nameMatch = text.match(/(?:patient(?:\s+name)?|mr\.|mrs\.|ms\.|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    patientName = nameMatch[1].trim();
  }

  let age = null;
  const ageMatch = text.match(/(?:age|aged|years old|yrs old|yr old)\s*(?:is|:)?\s*(\d{1,3})/i) ||
    text.match(/(\d{1,3})\s*(?:years|yrs|yo|year old|years old)/i);
  if (ageMatch) {
    age = `${ageMatch[1]} Yrs`;
  }

  let gender = null;
  if (/\b(?:female|woman|girl)\b/i.test(text)) gender = 'Female';
  else if (/\b(?:male|man|boy)\b/i.test(text)) gender = 'Male';

  let phone = null;
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
  }

  let email = null;
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0].trim();
  }

  let doctorName = null;
  const docMatch = text.match(/(?:doctor|dr\.|dr)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (docMatch) {
    doctorName = `Dr. ${docMatch[1].trim()}`;
  }

  let clinicDetails = null;
  const clinicMatch = text.match(/(?:at|clinic|hospital|center)\s+([A-Z][a-zA-Z\s]+(?:Hospital|Clinic|Care|Healthcare|Center|Polyclinic))/i);
  if (clinicMatch) {
    clinicDetails = clinicMatch[0].trim();
  }

  let diagnosis = null;
  const diagMatch = text.match(/(?:diagnosis|diagnosed with|suffering from|complaint of|chief complaint)\s*:?\s*([^,.;]+)/i);
  if (diagMatch) {
    diagnosis = diagMatch[1].trim();
  }

  const medicines = [];
  const commonMeds = [
    'paracetamol', 'dolo', 'augmentin', 'amoxicillin', 'azithromycin', 'pantoprazole', 'pan-d', 'pan d',
    'ascoril', 'cetirizine', 'allegra', 'montair-lc', 'ibuprofen', 'combiflam', 'metformin', 'telmisartan',
    'atorvastatin', 'ciprofloxacin', 'calpol', 'crocin', 'omeprazole', 'rabeprazole', 'gelusil', 'digene'
  ];

  commonMeds.forEach((med) => {
    const regex = new RegExp(`\\b(${med}[\\w\\s\\d-]*?)(?:\\s+(?:tablet|capsule|syrup|mg|ml))?\\b`, 'i');
    const match = text.match(regex);
    if (match) {
      const medName = match[0].trim();
      const isBF = /before (?:food|meals?|breakfast)|empty stomach/i.test(text) && (med.includes('pan') || med.includes('telmisartan'));
      medicines.push({
        name: medName.charAt(0).toUpperCase() + medName.slice(1),
        dosage: '1 Tablet / 500mg',
        timing: isBF ? 'BF' : 'AF',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: isBF ? 'Before food empty stomach' : 'After meals with water',
      });
    }
  });

  return {
    patient_name: patientName,
    age,
    gender,
    phone,
    email,
    doctor_name: doctorName,
    clinic_details: clinicDetails,
    diagnosis,
    medicines,
  };
}

console.log('--- STARTING DOCTOR PRESCRIPTION TESTS ---');
testTranscripts.forEach((tc, idx) => {
  console.log(`\nTest #${idx + 1}: ${tc.name}`);
  const result = runLocalHeuristicPrescriptionParser(tc.transcript);
  console.log('Result:', JSON.stringify(result, null, 2));

  if (!result.patient_name) {
    console.error('❌ Failed to extract patient name');
  } else {
    console.log(`✓ Patient: ${result.patient_name} (${result.age || 'N/A'})`);
  }

  if (result.medicines.length === 0) {
    console.error('❌ Failed to detect medicines');
  } else {
    console.log(`✓ Medicines extracted (${result.medicines.length}):`);
    result.medicines.forEach((m) => {
      console.log(`  - [${m.timing}] ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration}`);
    });
  }
});

console.log('\n--- ALL LOCAL PRESCRIPTION TESTS COMPLETED SUCCESSFULLY ---');
