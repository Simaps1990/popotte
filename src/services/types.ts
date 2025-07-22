export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  stock_enabled: boolean;
  stock_quantity: number;
  stock_variants: Array<{
    name: string;
    quantity: number;
  }>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockVariant {
  id?: string;
  name: string;
  quantity: number;
  price_adjustment?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
  is_available: boolean;
  stock_enabled: boolean;
  stock_quantity: string;
  stock_variants: StockVariant[];
}

export interface CategoryFormData {
  name: string;
  slug: string;
  display_order: number;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}
