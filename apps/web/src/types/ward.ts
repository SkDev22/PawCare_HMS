export type KennelSize = 'small' | 'medium' | 'large';

export type KennelRoom = { id: string; name: string; clinic_id: string };

export type ActiveHospitalization = {
  id:                  string;
  kennel_id:           string;
  reason:              string;
  admitted_at:         string;
  estimated_stay_days: number | null;
  pet: {
    id:      string;
    name:    string;
    species: string;
    breed:   string | null;
  };
};

export type KennelUnit = {
  id:                     string;
  label:                  string;
  size:                   string;
  is_occupied:            boolean;
  notes:                  string | null;
  room:                   KennelRoom;
  active_hospitalization: ActiveHospitalization | null;
};

export type HospOwner    = { id: string; first_name: string; last_name: string; phone?: string };
export type HospPet      = { id: string; name: string; species: string; breed: string | null; owner: HospOwner };
export type HospKennel   = { id: string; label: string; size: string; room: { id: string; name: string } };
export type HospCareLog  = {
  id:                  string;
  hospitalization_id:  string;
  performed_by:        string;
  type:                string;
  notes:               string;
  logged_at:           string;
  performed_by_staff:  { id: string; first_name: string; last_name: string } | null;
};

export type HospitalizationListItem = {
  id:                  string;
  pet_id:              string;
  kennel_id:           string;
  admitted_by:         string;
  reason:              string;
  admitted_at:         string;
  discharged_at:       string | null;
  discharge_notes:     string | null;
  estimated_stay_days: number | null;
  pet:    HospPet;
  kennel: HospKennel;
};

export type Hospitalization = HospitalizationListItem & {
  care_logs:         HospCareLog[];
  admitted_by_staff: { id: string; first_name: string; last_name: string; role: string } | null;
};

export type PaginatedHospitalizations = {
  items:      HospitalizationListItem[];
  nextCursor: string | null;
  hasMore:    boolean;
};
