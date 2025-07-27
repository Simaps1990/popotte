import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Order } from '../../lib/mockData'
import { AdminPageLayout } from '../../components/admin/AdminPageLayout'
import { orderService } from '../../services/orderService'

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Utiliser un flag pour suivre si le composant est monté
    let isMounted = true;
    
    const loadOrders = async () => {
      try {
        await fetchOrders();
        // Ne mettre à jour l'état que si le composant est toujours monté
        if (isMounted) {
          console.log('✅ Commandes chargées avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des commandes:', error);
      }
    };
    
    loadOrders();
    
    // Abonnement global aux mises à jour des commandes (pour les admins)
    const unsubscribe = supabase
      .channel('orders_admin_changes')
      .on('postgres_changes', 
        { 
          event: '*',  // Tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders'
        }, 
        (payload: any) => {
          console.log('📡 Mise à jour de commande détectée (admin):', payload);
          
          // Rafraîchir les données après une mise à jour seulement si le composant est monté
          if (isMounted) {
            fetchOrders();
          }
        }
      )
      .subscribe((status: string) => {
        if (isMounted) {
          console.log(`Statut de l'abonnement aux commandes (admin): ${status}`);
        }
      });
    
    // Nettoyage de l'abonnement lors du démontage du composant
    return () => {
      console.log('🔕 Désabonnement des mises à jour des commandes (admin)');
      isMounted = false;
      unsubscribe.unsubscribe();
    };
  }, [])

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:profiles!orders_user_id_fkey(full_name, email),
          order_items:order_items(*, products(name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const confirmPayment = async (orderId: string) => {
    try {
      // Mettre à jour le statut dans Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) {
        alert('Erreur lors de la confirmation');
        return;
      }
      fetchOrders();
      alert('Paiement confirmé !');
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Erreur lors de la confirmation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPaymentDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    // Charte graphique : remplace tous les fonds gris par bg-white
    switch (status) {
      case 'pending': return 'border-red-500 bg-red-50'
      case 'payment_notified': return 'border-orange-500 bg-orange-50'
      case 'confirmed': return 'border-green-500 bg-green-50'
      case 'cancelled': return 'border-blue-500 bg-white'
      default: return 'border-blue-500 bg-white'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'payment_notified': return 'Paiement notifié'
      case 'confirmed': return 'Confirmé'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  // Afficher uniquement les paiements notifiés
  const notifiedOrders = orders.filter(order => order.status === 'payment_notified')

  if (loading) {
    return (
      <AdminPageLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <div className="space-y-6">
        <div className="card text-center bg-white border border-gray-200">
          <div className="text-2xl font-bold text-[#10182a]">{notifiedOrders.length}</div>
          <div className="text-sm text-gray-500">commandes à traiter</div>
        </div>

        <div className="space-y-4">
          {notifiedOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune commande à traiter pour le moment</p>
            </div>
          ) : (
            notifiedOrders.map((order) => (
              <div key={order.id} className="card p-6 space-y-4 bg-white border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-[#10182a]">Commande #{order.id.slice(0, 6)}</h3>
                    <p className="text-sm text-gray-500">
                      Client: {order.profiles?.full_name || 'Anonyme'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                    {order.payment_notified_at && (
                      <p className="text-sm text-gray-500">
                        Paiement notifié: {formatPaymentDate(order.payment_notified_at)}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Produits</h4>
                  <ul className="space-y-2">
                    {order.order_items.map((item) => (
                      <li key={item.id} className="flex justify-between text-sm">
                        <span>{item.products.name} x {item.quantity}</span>
                        <span>{item.total_price.toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="font-medium">
                    Total: {order.total_amount.toFixed(2)} €
                  </div>
                  {order.status === 'payment_notified' && (
                    <button
                      onClick={() => confirmPayment(order.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Confirmer le paiement
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminPageLayout>
  )
}