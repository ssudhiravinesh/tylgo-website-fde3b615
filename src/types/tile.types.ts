export interface Tile {
  id: string;
  code: string;
  size_length: number;
  size_breadth: number;
  pieces_per_box?: number;
  price_per_box?: number;
  image_url?: string;
  qr_code_url?: string;
  category?: string;
  stock_quantity?: number;
  last_stock_sync?: string;
  created_at?: string;
  updated_at?: string;
}
