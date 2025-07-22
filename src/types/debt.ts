export enum DebtStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid',
}

export interface DebtItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface UserDebt {
  id: string;
  userId: string;
  user_id?: string; // Alias pour la compatibilité avec la base de données
  orderId?: string;
  amount: number;
  description?: string;
  status?: DebtStatus;
  items?: DebtItem[];
  createdAt?: string;
  created_at?: string; // Alias pour la compatibilité
  updatedAt?: string;
  paidAt?: string;
  confirmedBy?: string;
  createdBy?: string;
  created_by?: string; // Alias pour la compatibilité avec la base de données
}

export interface DebtSummary {
  totalUnpaid: number;
  totalPending: number;
  totalPaid: number;
  debts: UserDebt[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  variant?: string;
  created_at: string;
  products?: {
    name: string;
  };
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}
