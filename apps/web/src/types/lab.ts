export type LabStatus =
  | 'PENDING'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type LabResult = {
  id:                string;
  lab_order_id:      string;
  medical_record_id: string | null;
  test_name:         string;
  value:             string;
  unit:              string | null;
  reference_min:     string | null;
  reference_max:     string | null;
  is_abnormal:       boolean;
  recorded_at:       string;
};

export type LabOrderPet = {
  id:      string;
  name:    string;
  species: string;
  breed?:  string | null;
  owner:   { id: string; first_name: string; last_name: string; phone?: string };
};

export type LabOrderVet = {
  id:         string;
  first_name: string;
  last_name:  string;
  role:       string;
};

export type LabOrderListItem = {
  id:                string;
  pet_id:            string;
  ordered_by:        string;
  panel_name:        string;
  status:            LabStatus;
  is_external:       boolean;
  external_lab_name: string | null;
  ordered_at:        string;
  completed_at:      string | null;
  notes:             string | null;
  pet:               LabOrderPet;
  vet:               LabOrderVet;
  _count:            { results: number };
};

export type LabOrder = Omit<LabOrderListItem, '_count'> & {
  results: LabResult[];
};

export type PaginatedLabOrders = {
  items:      LabOrderListItem[];
  nextCursor: string | null;
  hasMore:    boolean;
};
