import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  paymentDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export function OrdersList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger les commandes depuis Supabase
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items:order_items(*, products(name))
          `)
          .eq('status', 'payment_notified')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des commandes', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleValidatePayment = async (orderId: string) => {
    try {
      // Ici, vous devriez faire un appel API pour valider le paiement
      // await fetch(`/api/orders/${orderId}/validate-payment`, { method: 'POST' });
      
      // Mise à jour locale pour l'exemple
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'paid' } : order
      ));
    } catch (error) {
      console.error('Erreur lors de la validation du paiement', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const pendingOrders = orders.filter(order => order.status === 'pending');

  return (
    <div className="mb-6 min-h-screen bg-white pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md bg-white">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="text-2xl font-bold text-orange-600">{pendingOrders.length}</div>
              <div className="text-sm text-gray-600">Paiements à vérifier</div>
            </div>
            
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div key={order.id} className="card border-l-4 border-orange-500 bg-orange-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{order.customerName}</h3>
                      <p className="text-sm text-gray-600">{order.customerEmail}</p>
                      <p className="text-xs text-gray-500">
                        Commande: {new Date(order.orderDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-orange-600">
                        Paiement notifié: {new Date(order.paymentDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{order.amount.toFixed(2)} €</div>
                      <div className="text-sm font-medium">Paiement notifié</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600 flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{item.price.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => handleValidatePayment(order.id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Confirmer le paiement</span>
                  </button>
                </div>
              ))}
              
              {pendingOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun paiement à vérifier pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default OrdersList;
