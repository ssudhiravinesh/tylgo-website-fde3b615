export interface Product {
  id: string;
  code?: string;
  name: string;
  category: string;
  unit: string;
  dimensions: Record<string, string | number>;
  price: number;
  image_url?: string;
  qr_code_url?: string;
  is_active: boolean;
  showroom_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoomProductSelection {
  id: string;
  room_id: string;
  product_id: string;
  customer_id: string;
  quantity: number;
  showroom_id?: string;
  product?: {
    code: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
  };
}
