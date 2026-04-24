export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  area?: string;
  state?: string;
  pincode?: string;
  category?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
  showroom_id?: string;
  created_at?: string;
  updated_at?: string;
  last_interaction_at?: string;
}

export interface CreateCustomerData {
  name: string;
  mobile: string;
  address?: string;
  area?: string;
  state?: string;
  pincode?: string;
  category?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
}
