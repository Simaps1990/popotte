import { supabase } from '../lib/supabase';

export type OrderStatus = 'unpaid' | 'payment_pending' | 'paid' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_notified_at?: string | null;
  notes?: string;
  order_items: OrderItem[];
  items_count?: number;
}

interface NotifyPaymentResponse {
  success: boolean;
  error?: string;
}

export const orderService = {
  /**
   * S'abonner aux mises à jour des commandes en temps réel
   * @param userId ID de l'utilisateur pour filtrer les commandes
   * @param callback Fonction appelée à chaque mise à jour
   * @returns Fonction pour se désabonner
   */
  subscribeToOrderUpdates(userId: string, callback: (payload: any) => void) {
    console.log(`🔔 Abonnement aux mises à jour des commandes pour l'utilisateur ${userId}`);
    
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { 
          event: '*',  // Tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        }, 
        (payload: any) => {
          console.log('📡 Mise à jour de commande reçue:', payload);
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        console.log(`Statut de l'abonnement aux commandes: ${status}`);
      });

    return () => {
      console.log('🔕 Désabonnement des mises à jour des commandes');
      subscription.unsubscribe();
    };
  },
  
  async notifyPayment(orderId: string): Promise<NotifyPaymentResponse> {
    try {
      // 1. Mettre à jour le statut de la commande
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({ 
          status: 'payment_pending',
          payment_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      
      // 2. Émettre un broadcast pour forcer la mise à jour en temps réel
      if (updatedOrder) {
        try {
          console.log('📢 Envoi du broadcast pour la notification de paiement de la commande:', orderId);
          
          // Forcer une mise à jour pour déclencher les abonnements temps réel
          const broadcastResult = await supabase
            .from('orders')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', orderId);
            
          console.log('📡 Résultat du broadcast:', broadcastResult);
        } catch (broadcastError) {
          console.warn('⚠️ Erreur non bloquante lors du broadcast:', broadcastError);
          // Ne pas bloquer le processus en cas d'erreur de broadcast
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error notifying payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      console.log('Récupération des commandes pour l\'utilisateur:', userId);
      
      // D'abord, récupérer les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      console.log('Commandes brutes reçues:', orders);
      
      if (!orders || orders.length === 0) {
        console.log('Aucune commande trouvée pour cet utilisateur');
        return [];
      }

      // Ensuite, récupérer les articles de commande pour chaque commande
      const orderIds = orders.map((order: any) => order.id);
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(name)')
        .in('order_id', orderIds);
        
      if (itemsError) throw itemsError;
      
      console.log('Articles de commande récupérés:', orderItems);
      
      // Combiner les données
      const ordersWithItems = orders.map((order: any) => {
        const items = (orderItems || []).filter((item: any) => item.order_id === order.id);
        return {
          ...order,
          order_items: items.map((item: any) => ({
            ...item,
            product_name: (item.products?.name || 'Produit inconnu') as string
          }))
        };
      });
      
      console.log('Commandes formatées:', ordersWithItems);
      return ordersWithItems;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }
};
