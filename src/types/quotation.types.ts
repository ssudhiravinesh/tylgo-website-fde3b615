export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  tile_id?: string | null;
  product_id?: string | null;
  room_id?: string | null;
  area?: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
  custom_boxes?: number;
  tile?: {
    id: string;
    code: string;
    size_length: number;
    size_breadth: number;
    price_per_box: number;
    pieces_per_box: number;
    category?: string;
    image_url?: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
    price: number;
    image_url?: string;
  };
  room?: {
    id: string;
    name: string;
    length: number;
    width: number;
    unit: string;
    has_floor?: boolean;
    has_wall?: boolean;
    wall_length?: number;
    wall_height?: number;
    measurements?: Array<{ length: string; width: string }>;
  };
  staircases?: {
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  };
  staircase_id?: string;
  quantity?: number;
  tile_type?: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status: string;
  notes?: string;
  wastage_percentage?: number;
  discount_percentage?: number;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    address?: string;
    area?: string;
    state?: string;
    pincode?: string;
  };
  worker?: {
    id: string;
    name: string;
    email: string;
  };
  quotation_items?: QuotationItem[];
}

export interface CreateQuotationData {
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status?: string;
  notes?: string;
  wastage_percentage?: number;
  discount_percentage?: number;
  discount_amount?: number;
  items: Omit<QuotationItem, 'id' | 'quotation_id'>[];
}

export interface QuotationFilters {
  quickSort?: string;
  year?: number | null;
  month?: number | null;
  overrideShowroomId?: string;
}
