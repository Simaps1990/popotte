import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ExternalLink, Bell, CheckCircle, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Services et contextes
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { debtService } from '../services/debtService';
import { checkDatabaseStructure } from '../lib/supabase';
import { supabase } from '../lib/supabaseClient';
import { useRealTimeSubscriptions, useCacheInvalidation } from '../hooks/useRealTimeSubscriptions';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { useDebtSubscription } from '../hooks/useDebtSubscription';

// Fonction utilitaire pour formater les dates
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy à HH:mm', { locale: fr });
};

// Types globaux
type OrderStatus = 'unpaid' | 'payment_pending' | 'paid' | 'cancelled';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product_name?: string;
  products?: {
    name: string;
  };
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_notified_at?: string | null;
  items_count?: number;
  notes?: string;
  order_items: OrderItem[];
  products?: any[];
}

interface UserDebt {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  order_id?: string;
  order?: Order | null; // Ajout du lien vers la commande associée
}

interface PaymentNotification {
  id: string;
  user_id: string;
  debt_ids: string[];
  total_amount: string;
  status: string;
  notified_at: string;
}

export function Dettes() {
  // Ajout pour la notification de paiement groupé
  const [showNotifyButton, setShowNotifyButton] = useState(false);
  const { user } = useAuth();
  const [debts, setDebts] = useState<UserDebt[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInitiated, setPaymentInitiated] = useState<boolean>(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [showPayPalButton, setShowPayPalButton] = useState(false);
  const [processingBulkPayment, setProcessingBulkPayment] = useState(false);
  const [processingPayments, setProcessingPayments] = useState<Record<string, boolean>>({});
  // Nouvel état pour suivre si la notification est en cours
  const [notifying, setNotifying] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PaymentNotification[]>([]);
  
  // Note: unpaidDebts et unpaidTotal sont définis plus bas dans le code

  // Hook pour l'invalidation du cache - avec référence pour éviter les appels multiples
  const { invalidateCache } = useCacheInvalidation();
  const cacheInvalidatedRef = React.useRef(false);
  
  // Hook pour recharger les données lors de la navigation
  useDataRefresh(() => {
    console.log('🔄 Rechargement des données de la page Dettes');
    fetchAllDebtsAndOrders();
  });

  // Callbacks pour les abonnements temps réel
  const handlePaymentNotificationChange = React.useCallback(() => {
    console.log('🔔 Notification de paiement modifiée - Rechargement des données');
    fetchNotifications();
    fetchAllDebtsAndOrders();
  }, []);

  const handleDebtChange = React.useCallback(() => {
    console.log('🔔 Dette modifiée - Rechargement des données');
    fetchAllDebtsAndOrders();
  }, []);

  const handleOrderChange = React.useCallback(() => {
    console.log('🔔 Commande modifiée - Rechargement des données');
    fetchAllDebtsAndOrders();
  }, []);

  // Abonnements temps réel - Sans l'abonnement aux dettes qui est maintenant géré par useDebtSubscription
  useRealTimeSubscriptions({
    onPaymentNotificationChange: handlePaymentNotificationChange,
    onOrderChange: handleOrderChange,
    userId: user?.id
  });
  
  // Utilisation du hook centralisé pour l'abonnement aux dettes
  useDebtSubscription(user?.id, handleDebtChange);

  // Fonction utilitaire pour formater les dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy à HH:mm', { locale: fr });
    } catch (error) {
      console.error('Erreur de formatage de date:', error);
      return 'Date inconnue';
    }
  };

  // Fonction utilitaire pour formater les prix
  const formatPrice = (price: number) => {
    return price.toFixed(2).replace('.', ',');
  };

  useEffect(() => {
    // Utiliser un flag pour suivre si le composant est monté
    let isMounted = true;
    
    const checkStructure = async () => {
      try {
        await checkDatabaseStructure();
      } catch (error) {
        console.error('Erreur lors de la vérification de la structure:', error);
      }
    };
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      // Invalider le cache avant de charger les données - UNE SEULE FOIS
      if (!cacheInvalidatedRef.current) {
        console.log('🗑️ Invalidation du cache avant chargement des dettes');
        invalidateCache();
        cacheInvalidatedRef.current = true;
      }
      
      try {
        await fetchAllDebtsAndOrders();
        await fetchNotifications();
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        setLoading(false);
        console.error('Erreur dans loadData:', err);
      }
    };

    if (user?.id) {
      loadData();
      checkStructure();
      
      // Abonnement aux mises à jour en temps réel des commandes uniquement
      // L'abonnement aux dettes est maintenant géré par useDebtSubscription
      const unsubscribeOrders = orderService.subscribeToOrderUpdates(user.id, (payload: any) => {
        console.log('💬 Mise à jour de commande détectée:', payload);
        
        // Rafraîchir les données après une mise à jour seulement si le composant est monté
        if (isMounted) {
          fetchAllDebtsAndOrders();
        }
      });
      
      // Nettoyage des abonnements lors du démontage du composant
      return () => {
        console.log('🔕 Désabonnement des mises à jour des commandes');
        isMounted = false;
        unsubscribeOrders();
      };
    }
  }, [user?.id]);

  // Fonction pour récupérer les notifications de paiement en attente
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      // Ne pas invalider le cache à chaque appel
      const { data, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('notified_at', { ascending: false });

      if (error) throw error;
      setPendingNotifications(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  // Fonction pour récupérer dettes ET commandes, puis faire le mapping
  const fetchAllDebtsAndOrders = async () => {
    if (!user?.id) return;

    console.log('[DEBUG fetchAllDebtsAndOrders] user.id =', user.id);
    setLoading(true);
    
    try {
      // Récupérer les dettes
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[DEBUG fetchAllDebtsAndOrders] debtsFallback =', debtsData || [], 'debtsError =', debtsError);
      
      if (debtsError) {
        console.error('Erreur lors de la récupération des dettes:', debtsError);
        throw debtsError;
      }
      
      // Récupérer les commandes
      console.log('Récupération des commandes pour l\'utilisateur:', user.id);
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (id, order_id, product_id, quantity, unit_price, total_price, notes, products (name))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (ordersError) {
        console.error('Erreur lors de la récupération des commandes:', ordersError);
        throw ordersError;
      }
      
      // Mise à jour des états avec les données récupérées
      console.log('Mise à jour des états avec les données récupérées:', { debts: debtsData, orders: ordersData });
      setDebts(debtsData || []);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des dettes et commandes:', error);
    }
  };

// Fonction pour notifier le paiement groupé après PayPal
  const handleNotifyBulkPayment = async () => {
  // Éviter les clics multiples
  if (notifying) {
    return;
  }
  
  if (!user) {
    toast.error("Vous devez être connecté.");
    return;
  }
    try {
      // Activer l'état de notification en cours
      setNotifying(true);
      
      const unpaidDebts = debts.filter(d => d.status === 'unpaid');
      if (unpaidDebts.length === 0) {
        toast.error('Aucune dette impayée à notifier.');
        setNotifying(false);
        return;
      }
      
      // Sauvegarde des états actuels pour restauration en cas d'erreur
      const previousDebts = [...debts];
      
      const debtIds = unpaidDebts.map(d => d.id);
      const total = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);
      
      // Mise à jour optimiste de l'interface utilisateur
      // 1. Mettre à jour le statut des dettes en local
      setDebts(currentDebts => 
        currentDebts.map(debt => 
          debtIds.includes(debt.id) 
            ? { ...debt, status: 'payment_pending' as OrderStatus, updated_at: new Date().toISOString() } 
            : debt
        )
      );
      
      // 2. Créer une notification locale temporaire
      const tempNotification = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        debt_ids: debtIds,
        total_amount: total.toString(),
        status: 'pending',
        notified_at: new Date().toISOString()
      };
      
      // Ajouter la notification temporaire à l'interface
      setPendingNotifications(prev => [...prev, tempNotification]);
      
      // 3. Notification de succès immédiate
      toast.success('Notification envoyée aux popotiers !');
      
      // Désactiver les boutons de notification
      setShowNotifyButton(false);
      setPaymentInitiated(false); // S'assurer que l'autre bouton est également masqué
      
      // Appels aux services en arrière-plan
      // 1. Insérer dans la table payment_notifications
      const { data: notifData, error } = await supabase
        .from('payment_notifications')
        .insert([{
          ...(user ? { user_id: user.id } : {}),
          debt_ids: debtIds,
          total_amount: total,
          status: 'pending',
          notified_at: new Date().toISOString()
        }])
        .select();
      if (error) throw error;

      // 2. Mettre à jour le statut des dettes concernées
      const { error: updateError } = await supabase
        .from('debts')
        .update({ status: 'payment_pending' })
        .in('id', debtIds);
      if (updateError) throw updateError;

      // Rafraîchir les données silencieusement pour s'assurer de la cohérence
      await fetchAllDebtsAndOrders();
      await fetchNotifications(); // Ajout pour rafraîchir la section orange
    } catch (err) {
      console.error('Erreur lors de la notification du paiement:', err);
      
      // Restaurer l'état précédent en cas d'erreur
      // Récupérer les dettes non modifiées
      fetchDebts();
      
      // Supprimer la notification temporaire
      setPendingNotifications(prev => prev.filter(n => !n.id.startsWith('temp-')));
      
      toast.error('Erreur lors de la notification du paiement');
    } finally {
      // Désactiver l'état de notification en cours
      setNotifying(false);
    }
  };

// Fonction pour payer toutes les dettes en une seule fois
  const handlePayAllDebts = async () => {
    if (!user) {
      toast.error("Vous devez être connecté.");
      return;
    }
    if (debts.length === 0) {
      toast.error('Aucune dette à payer');
      return;
    }

    try {
      // Mise à jour immédiate de l'interface utilisateur
      setProcessingBulkPayment(true);

      // Calculer le montant total des dettes
      const totalAmount = debts.reduce((sum: number, debt: UserDebt) => sum + debt.amount, 0);

      // Préparer la description du paiement
      const description = `Paiement de ${debts.length} dette(s)`;

      // Créer un tableau d'identifiants de dettes
      const debtIds = debts.map((debt: UserDebt) => debt.id);
      
      // Mise à jour instantanée de l'interface utilisateur
      // Afficher immédiatement le bouton de notification
      setPaymentInitiated(true);
      setShowNotifyButton(true);
      
      // Notification visuelle immédiate
      toast('Redirection vers le paiement PayPal officiel. Merci d\'indiquer le motif dans PayPal !', { icon: '💸' });
      
      // Ouvrir PayPal dans un nouvel onglet
      window.open('https://www.paypal.me/popotefor', '_blank');

    } catch (error) {
      console.error('Erreur lors du paiement groupé:', error);
      toast.error('Une erreur est survenue lors du paiement groupé');
      
      // Réinitialiser l'interface en cas d'erreur
      setPaymentInitiated(false);
      setShowNotifyButton(false);
    } finally {
      setProcessingBulkPayment(false);
    }
  };

  // Gérer la notification de paiement après paiement PayPal
  const handleNotifyPayment = async (orderId: string) => {
    const currentUser = user; // Utiliser une variable locale pour éviter les problèmes de closure
    if (!currentUser) return;

    // Trouver la commande correspondante pour la mise à jour optimiste
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (!orderToUpdate) return;
    
    // Sauvegarde des états actuels pour restauration en cas d'erreur
    const previousOrders = [...orders];
    const previousDebts = [...debts];

    try {
      // Mise à jour optimiste de l'interface utilisateur
      setProcessingPayments((prev: Record<string, boolean>) => ({
        ...prev,
        [orderId]: true
      }));
      
      // Mise à jour optimiste du statut de la commande
      setOrders(currentOrders => 
        currentOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: 'payment_pending' as OrderStatus,
                payment_notified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } 
            : order
        )
      );
      
      // Mise à jour optimiste des dettes associées à cette commande
      setDebts(currentDebts => 
        currentDebts.map(debt => 
          debt.order_id === orderId 
            ? { ...debt, status: 'payment_pending' as OrderStatus, updated_at: new Date().toISOString() } 
            : debt
        )
      );
      
      // Notification de succès immédiate
      toast.success('Paiement notifié avec succès');

      // Appel au service en arrière-plan
      await orderService.notifyPayment(orderId);

      // Rafraîchir les données silencieusement pour s'assurer de la cohérence
      await Promise.all([
        fetchDebts(),
        fetchUserOrders()
      ]);

    } catch (error) {
      console.error('Erreur lors de la notification du paiement:', error);
      
      // Restaurer les états précédents en cas d'erreur
      setOrders(previousOrders);
      setDebts(previousDebts);
      
      toast.error('Une erreur est survenue lors de la notification du paiement');
    } finally {
      setProcessingPayments((prev: Record<string, boolean>) => ({
        ...prev,
        [orderId]: false
      }));
    }
  };

  // Récupérer les dettes de l'utilisateur
  const fetchDebts = async () => {
    const currentUser = user;
    if (!currentUser) {
      console.log('Aucun utilisateur connecté');
      return;
    }

    console.log('Récupération des dettes pour l\'utilisateur:', currentUser.id);
    setLoading(true);
    setError(null);

    try {
      // Essayer d'abord avec la fonction RPC
      console.log('Tentative de récupération via RPC...');
      const { data: debtsFromRPC, error: rpcError } = await supabase
        .rpc('get_user_debts', { user_id_param: currentUser.id });

      console.log('Réponse RPC complète:', { data: debtsFromRPC, error: rpcError });

      if (rpcError) {
        console.warn('La fonction get_user_debts a échoué, utilisation du fallback:', rpcError);
        
        // Fallback: récupération directe depuis la table
        console.log('Tentative de récupération directe depuis la table debts...');
        const { data: debtsData, error: debtsError } = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        console.log('Résultat de la requête directe:', { data: debtsData, error: debtsError });

        if (debtsError) {
          console.error('Erreur lors de la récupération des dettes:', debtsError);
          throw debtsError;
        }
        
        console.log('Dettes récupérées avec succès via fallback:', debtsData);
        setDebts(debtsData || []);
      } else {
        console.log('Dettes récupérées avec succès via RPC:', debtsFromRPC);
        // S'assurer que les montants sont des nombres
        const formattedDebts = Array.isArray(debtsFromRPC) 
          ? debtsFromRPC.map(debt => ({
              ...debt,
              amount: typeof debt.amount === 'string' ? parseFloat(debt.amount) : debt.amount
            }))
          : [];
        setDebts(formattedDebts);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des dettes:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les commandes de l'utilisateur
  const fetchUserOrders = async () => {
    const currentUser = user; // Utiliser une variable locale pour éviter les problèmes de closure
    if (!currentUser) {
      console.log('Aucun utilisateur connecté pour récupérer les commandes');
      return;
    }

    console.log('Récupération des commandes pour l\'utilisateur:', currentUser.id);
    setLoading(true);

    try {
      const userOrders = await orderService.getUserOrders(currentUser.id);
      console.log('Commandes récupérées:', userOrders);
      setOrders(userOrders);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour gérer le paiement d'une dette
  const handlePayDebt = async (debt: UserDebt) => {
    const currentUser = user; // Utiliser une variable locale pour éviter les problèmes de closure
    if (!currentUser) return;

    try {
      // Mettre à jour l'état de chargement pour cette dette
      setProcessingPayments((prev: Record<string, boolean>) => ({
        ...prev,
        [debt.id]: true
      }));

      // Préparer les données pour le paiement
      const paymentData = {
        amount: debt.amount,
        description: debt.description,
        order_id: debt.order_id,
        user_id: currentUser.id,
        debt_id: debt.id
      };

      // Appeler l'API de paiement
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du paiement');
      }

      const { approvalUrl } = await response.json();

      // Rediriger vers PayPal pour le paiement
      window.location.href = approvalUrl;

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      toast.error('Une erreur est survenue lors du traitement du paiement');
    } finally {
      // Réinitialiser l'état de chargement
      setProcessingPayments((prev: Record<string, boolean>) => ({
        ...prev,
        [debt.id]: false
      }));
    }
  };

  // Définir les sections de dettes AVANT le rendu principal
  // Associer chaque dette à sa commande si possible
  const debtsWithOrder = debts.map((debt) => ({
    ...debt,
    order: debt.order_id ? orders.find((o) => o.id === debt.order_id) || null : null,
  }));
  const unpaidDebts = debtsWithOrder.filter((debt) => debt.status === 'unpaid');
  const paymentPendingDebts = debtsWithOrder.filter((debt) => debt.status === 'payment_pending');
  const paidDebts = debtsWithOrder.filter((debt) => debt.status === 'paid');
  const cancelledDebts = debtsWithOrder.filter((debt) => debt.status === 'cancelled');
  const unpaidTotal = unpaidDebts.reduce((total, debt) => total + debt.amount, 0);
  const paymentPendingTotal = paymentPendingDebts.reduce((total, debt) => total + debt.amount, 0);
  const paidTotal = paidDebts.reduce((total, debt) => total + debt.amount, 0);

// Composant pour afficher une section de dettes
interface DebtSectionProps {
  title: string;
  debts: UserDebt[];
  total: number;
  showPayButton?: boolean;
  showTotal?: boolean;
}

const DebtSection: React.FC<DebtSectionProps> = ({ 
  // title is defined in props but not used in the component
  debts, 
  total, 
  showPayButton = false 
  // showTotal is defined in props but not used in the component
}) => {
  if (debts.length === 0) return null;

  const status = debts[0]?.status || '';
  function getStatusStyles(status: string) {
    switch (status) {
      case 'unpaid':
        return { bg: 'bg-red-50 border border-red-200', text: 'text-red-800', icon: '⏳', label: 'Impayée' };
      case 'payment_pending':
        return { bg: 'bg-orange-100 border border-orange-200', text: 'text-orange-800', icon: '🕒', label: 'Paiement signalé' };
      case 'paid':
        return { bg: 'bg-green-100 border border-green-200', text: 'text-green-800', icon: '✔️', label: 'Payée' };
      case 'cancelled':
        return { bg: 'bg-gray-100 border border-gray-300', text: 'text-gray-800', icon: '✖️', label: 'Annulée' };
      default:
        return { bg: 'bg-gray-100 border border-gray-300', text: 'text-gray-800', icon: '', label: status };
    }
  }
  const statusStyles = getStatusStyles(status);

  return (
    <div className="mb-8">

      <div className="overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {Object.entries(
            debts.reduce<Record<string, UserDebt[]>>((acc: Record<string, UserDebt[]>, debt: UserDebt) => {
              const date = new Date(debt.created_at).toLocaleDateString('fr-FR');
              if (!acc[date]) acc[date] = [];
              acc[date].push(debt);
              return acc;
            }, {})
          ).map(([date, dateDebts]) => (
            <li key={date}>

              <ul>
                {dateDebts.map((debt: UserDebt) => (
                  <li key={debt.id} className={
  (debt.status === 'unpaid'
    ? 'card border-l-4 border-red-500 bg-red-50'
    : debt.status === 'payment_pending'
    ? 'card border-l-4 border-orange-500 bg-orange-50'
    : debt.status === 'paid'
    ? 'card border-l-4 border-green-500 bg-green-50'
    : 'card bg-gray-50 border-gray-200') + ' mb-4'
}>
  {/* Affichage simplifié pour dettes impayées */}
{debt.status === 'unpaid' && debt.order ? (
  <div className="mb-3">
    <div className="text-sm font-semibold text-gray-700">
      Commande du {formatDate(debt.order.created_at)}
    </div>
    <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
      {debt.order.order_items && debt.order.order_items.length > 0
        ? debt.order.order_items.map(item =>
            `${item.quantity}x ${item.product_name ?? 'Produit'} - ${(typeof item.unit_price === 'number' ? item.unit_price : 0).toFixed(2)} €`
          ).join('\n')
        : 'Aucun produit'}
    </div>
  </div>
) : (
  <>
    <div className="flex justify-between items-start mb-2">
      <span className="text-sm text-gray-500">{debt.order ? `Commande: ${formatDate(debt.order.created_at)}` : formatDate(debt.created_at)}</span>
      <span className={
        debt.status === 'unpaid' ? 'font-semibold text-red-600' :
        debt.status === 'payment_pending' ? 'font-semibold text-orange-600' :
        debt.status === 'paid' ? 'font-semibold text-green-600' :
        'font-semibold text-gray-600'
      }>{debt.amount.toFixed(2)} €</span>
    </div>
    <div className="space-y-1 mb-3">
      <div className="text-sm text-gray-600">{debt.description || `Dette #${debt.id.slice(0, 8)}`}{debt.order && debt.order.order_items && debt.order.order_items.length > 0 ?
        ': ' + debt.order.order_items.map(item => `${item.quantity}x ${item.product_name ?? 'Produit'} - ${(typeof item.unit_price === 'number' ? item.unit_price : 0).toFixed(2)} €`).join(', ')
        : ''}
      </div>
    </div>
  </>
) }
  
  {debt.status === 'payment_pending' && (
    <div className="text-sm text-orange-700 font-medium bg-orange-100 p-2 rounded">⏳ En attente de confirmation par les popottiers</div>
  )}
  {debt.status === 'paid' && (
    <div className="text-sm text-green-700 font-medium bg-green-100 p-2 rounded">✅ Paiement confirmé</div>
  )}
</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {showPayButton && status === 'unpaid' && (
  <div className="card bg-red-50 border-red-200 mt-4">
    <div className="flex justify-between items-center mb-4">
      <span className="font-semibold">Total à régler :</span>
      <span className="text-xl font-bold text-red-600">{total.toFixed(2)} €</span>
    </div>
    <div className="space-y-3">
      <button
        onClick={handlePayAllDebts}
        disabled={processingBulkPayment}
        className="w-full btn-primary flex items-center justify-center space-x-2"
      >
        <CreditCard className="h-4 w-4 mr-1" />
        <span>{processingBulkPayment ? 'Traitement...' : 'Régler mes dettes'}</span>
      </button>
      <button
  onClick={handleNotifyBulkPayment}
  disabled={notifying}
  className="w-full btn-primary flex items-center justify-center space-x-2 mt-2"
>
  <Bell className="h-4 w-4 mr-1" />
  <span>{notifying ? 'Notification en cours...' : 'Notifier mon paiement aux popotiers'}</span>
</button>
    </div>
  </div>
)}
      </div>
    </div>
  );
} // <-- Fin du composant interne DebtSection

// Vérification user null
if (!user) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      Veuillez vous connecter pour accéder à vos dettes.
    </div>
  );
}

// Rendu principal du composant Dettes
return (
  <div className="min-h-screen bg-gray-50 pb-10">
    <main className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Mes dettes
      </h1>
      {/* Bouton Notifier mon paiement aux popotiers */}
      {showNotifyButton && paymentInitiated && (
        <div className="bg-orange-50 p-4 rounded mt-4 flex flex-col items-center">
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold shadow"
            onClick={handleNotifyBulkPayment}
            disabled={notifying}
          >
            {notifying ? 'Notification en cours...' : 'Notifier mon paiement aux popotiers'}
          </button>
          <div className="text-xs text-gray-600 mt-2">
            Un récapitulatif de vos dettes sera envoyé à l’équipe pour validation.
          </div>
        </div>
      )}
      {/* Sections synthèse dettes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-red-600">🔴 Dettes non réglées</h2>
        {unpaidDebts.length === 0 ? (
          <div className="text-gray-500 text-sm">Aucune dette à régler.</div>
        ) : (
          <DebtSection
            title="Dettes non réglées"
            debts={unpaidDebts}
            total={unpaidTotal}
            showPayButton={true}
          />
        )}
      </div>
      {/* Rubrique orange groupée par notification */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-orange-600 mt-6">🟠 Dettes en attente de confirmation</h2>
        {pendingNotifications.length === 0 ? (
          <div className="text-gray-500 text-sm">Aucune dette en attente de confirmation.</div>
        ) : (
          pendingNotifications.map((notif: PaymentNotification) => (
            <div key={notif.id} className="card border-l-4 border-orange-500 bg-white mb-4 p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-900">{formatDate(notif.notified_at)}</span>
                <span className="font-semibold text-orange-600">{parseFloat(notif.total_amount).toFixed(2)} €</span>
              </div>
              <div className="space-y-1 mb-3">
                <div className="text-sm text-gray-600">En attente de confirmation</div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Section Dettes réglées supprimée comme demandé */}
    </main>
    {/* Le footer global est géré par le composant BottomNavigation */}
  </div>
);
}