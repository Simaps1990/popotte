export enum DebtStatus {
  UNPAID = 'unpaid',
  PAYMENT_PENDING = 'payment_pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export interface DebtItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Debt {
  id: string;
  userId: string;
  user_id?: string;
  orderId?: string | null;
  order_id?: string | null;
  amount: number;
  description: string;
  status: DebtStatus;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface DebtSummary {
  totalUnpaid: number;
  totalPending: number;
  totalPaid: number;
  debts: Debt[];
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
