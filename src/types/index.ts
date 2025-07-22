export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  stock_enabled: boolean;
  stock_quantity: number | null;
  stock_variants: Array<{
    name: string;
    quantity: number;
  }> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
  stock_enabled?: boolean;
  stock_quantity?: number;
  stock_variants?: Array<{
    name: string;
    quantity: number;
  }>;
}

export interface CategoryFormData {
  name: string;
  description: string;
  image_url: string;
  display_order?: number;
}
