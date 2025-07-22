// Déclarations de types globaux

interface Window {
  // Ajoutez ici des propriétés globales si nécessaire
}

type OrderStatus = 'pending' | 'payment_pending' | 'paid' | 'completed';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  products?: {
    name: string;
  };
  [key: string]: any;
}

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  items_count?: number;
  payment_notified_at?: string;
  notes?: string;
  [key: string]: any;
}

interface UserDebt {
  id: string;
  user_id: string;
  userId?: string; // Alias pour la rétrocompatibilité
  amount: number;
  status?: OrderStatus;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  [key: string]: any;
}

// Déclaration des types pour les modules sans types
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
