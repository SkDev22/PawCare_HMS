export type SoapNoteVet = {
  id: string;
  first_name: string;
  last_name: string;
};

export type SoapNote = {
  id: string;
  medical_record_id: string;
  vet_id: string;
  vet: SoapNoteVet;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
};

export type Vitals = {
  id: string;
  medical_record_id: string;
  weight_kg: string | null;
  temperature_c: string | null;
  heart_rate_bpm: number | null;
  respiratory_rate: number | null;
  blood_pressure: string | null;
  body_condition_score: number | null;
  recorded_at: string;
};

export type Diagnosis = {
  id: string;
  medical_record_id: string;
  code: string | null;
  name: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
};

export type Prescription = {
  id: string;
  pet_id: string;
  medical_record_id: string | null;
  prescribed_by: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  quantity: number | null;
  refills_remaining: number;
  instructions: string | null;
  dispensed_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  item_id: string | null;
  charge_id: string | null;
  item: { id: string; name: string } | null;
  charge: { id: string; total: string } | null;
  created_at: string;
  updated_at: string;
};

export type LabResult = {
  id: string;
  test_name: string;
  value: string;
  unit: string | null;
  reference_min: string | null;
  reference_max: string | null;
  is_abnormal: boolean;
  recorded_at: string;
};

export type RecordVet = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  specialization: string | null;
  avatar_url: string | null;
};

export type RecordPetOwner = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
};

export type RecordPetAllergy = {
  id: string;
  allergen: string;
  reaction: string | null;
  severity: string | null;
};

export type RecordPet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: string | null;
  sex: string | null;
  weight_kg: string | null;
  owner: RecordPetOwner;
  allergies: RecordPetAllergy[];
};

export type RecordAppointment = {
  id: string;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
};

export type MedicalRecordListItem = {
  id: string;
  pet_id: string;
  vet_id: string;
  visit_date: string;
  chief_complaint: string | null;
  created_at: string;
  pet: {
    id: string;
    name: string;
    species: string;
    owner: { id: string; first_name: string; last_name: string };
  };
  vet: { id: string; first_name: string; last_name: string; role: string };
  diagnoses: Diagnosis[];
  _count: { prescriptions: number; lab_results: number };
};

export type MedicalRecord = {
  id: string;
  pet_id: string;
  appointment_id: string | null;
  vet_id: string;
  visit_date: string;
  chief_complaint: string | null;
  created_at: string;
  updated_at: string;
  pet: RecordPet;
  vet: RecordVet;
  appointment: RecordAppointment | null;
  soap_note: SoapNote | null;
  vitals: Vitals | null;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  lab_results: LabResult[];
  _count: { attachments: number };
};

export type Charge = {
  id: string;
  medical_record_id: string;
  item_id: string | null;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: string;
  total: string;
  created_at: string;
  item: { id: string; name: string; category: string; unit: string } | null;
  service: { id: string; name: string; category: string } | null;
};

export type PaginatedMedicalRecords = {
  items: MedicalRecordListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
