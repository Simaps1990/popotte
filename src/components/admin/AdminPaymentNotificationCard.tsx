import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  products?: { name: string };
}

export interface AdminPaymentNotificationCardProps {
  id: string;
  amount: number;
  notifiedAt: string;
  userName: string;
  userEmail?: string;
  orderDate?: string;
  orderItems?: OrderItem[];
  onConfirm: () => void;
  onDelete: () => void;
  processing?: boolean;
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const AdminPaymentNotificationCard: React.FC<AdminPaymentNotificationCardProps> = ({
  // id is used as a prop but not directly in the component
  amount,
  notifiedAt,
  userName,
  userEmail,
  orderDate,
  orderItems,
  onConfirm,
  onDelete,
  processing = false,
}) => {
  return (
    <div className="border border-orange-300 rounded-lg p-4 mb-3 shadow-sm" style={{ backgroundColor: 'white' }}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
        <div>
          <div className="font-semibold text-orange-800 text-lg">{userName} {userEmail && <span className="text-xs text-gray-500">({userEmail})</span>}</div>
          {orderDate && (
            <div className="text-xs text-gray-500">Commande du {formatDate(orderDate)}</div>
          )}
        </div>
        <div className="text-2xl font-bold text-orange-700 mt-2 md:mt-0">{amount.toFixed(2)} €</div>
      </div>
      <div className="text-sm text-gray-600 mb-2">Signalé le {formatDate(notifiedAt)}</div>
      {orderItems && orderItems.length > 0 && (
        <ul className="mb-2 text-sm">
          {orderItems.map(item => (
            <li key={item.id} className="flex justify-between border-b border-orange-200 py-1 last:border-b-0">
              <span>{item.product_name || item.products?.name || 'Produit'}</span>
              <span>x{item.quantity}</span>
              <span>{item.total_price.toFixed(2)} €</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 mt-2">
        <button
          className="flex-1 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded shadow disabled:opacity-50"
          onClick={onConfirm}
          disabled={processing}
        >
          <CheckCircle className="mr-2" size={20} /> Confirmer
        </button>
        <button
          className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded shadow disabled:opacity-50"
          onClick={onDelete}
          disabled={processing}
        >
          <XCircle className="mr-2" size={20} /> Supprimer
        </button>
      </div>
    </div>
  );
};

export default AdminPaymentNotificationCard;
