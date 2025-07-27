import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AdminPaymentNotificationCard from "../../components/admin/AdminPaymentNotificationCard";
import { useRealTimeSubscriptions, useCacheInvalidation } from "../../hooks/useRealTimeSubscriptions";
import { toast } from 'react-hot-toast';

interface PaymentNotification {
  notification_id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  user_full_name: string;
  total_amount: string;
  notified_at: string;
}

const PaymentsToVerify: React.FC = () => {
  console.log("[ADMIN DEBUG] PaymentsToVerify MOUNTED");
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Hook pour l'invalidation du cache
  const { invalidateCache } = useCacheInvalidation();

  // Callback pour les changements de notifications de paiement
  const handlePaymentNotificationChange = React.useCallback(() => {
    console.log('🔔 Notification de paiement modifiée - Rechargement automatique');
    fetchNotifications();
  }, []);

  // Abonnements temps réel
  useRealTimeSubscriptions({
    onPaymentNotificationChange: handlePaymentNotificationChange
  });

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    // Invalider le cache avant de récupérer les données
    console.log('🗑️ Invalidation du cache avant récupération des notifications');
    invalidateCache();
    
    const { data, error } = await supabase.rpc("rpc_payments_to_verify");
    console.log("[ADMIN DEBUG] Résultat RPC:", data, "Erreur:", error);
    if (error) {
      setError(error.message);
      toast.error('Erreur lors du chargement des notifications');
    } else {
      setNotifications(data || []);
      console.log(`✅ ${data?.length || 0} notifications chargées`);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('🚀 Initialisation PaymentsToVerify - Chargement des notifications');
    fetchNotifications();
    // eslint-disable-next-line
  }, []);

  const handleValidate = async (notification_id: string) => {
    setProcessing(notification_id);
    
    try {
      console.log('✅ Validation de la notification:', notification_id);
      
      // Mise à jour optimiste - retirer immédiatement la notification de la liste
      const previousNotifications = [...notifications];
      setNotifications(current => current.filter(n => n.notification_id !== notification_id));
      
      // Notification visuelle immédiate
      toast.success('Paiement confirmé avec succès');
      
      const { error } = await supabase.rpc("validate_payment_notification", {
        notif_id: notification_id,
      });
      
      if (error) {
        console.error('Erreur lors de la validation:', error);
        // Restaurer la liste en cas d'erreur
        setNotifications(previousNotifications);
        toast.error('Erreur lors de la validation : ' + error.message);
      } else {
        console.log('✅ Notification validée avec succès');
        // Forcer une actualisation pour s'assurer de la cohérence
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Erreur inattendue lors de la validation:', err);
      toast.error('Erreur inattendue lors de la validation');
      await fetchNotifications();
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (notification_id: string) => {
    setProcessing(notification_id);
    
    try {
      console.log('❌ Annulation de la notification:', notification_id);
      
      // Mise à jour optimiste - retirer immédiatement la notification de la liste
      const previousNotifications = [...notifications];
      setNotifications(current => current.filter(n => n.notification_id !== notification_id));
      
      // Notification visuelle immédiate
      toast.success('Notification supprimée');
      
      const { error } = await supabase.rpc("cancel_payment_notification", {
        notif_id: notification_id,
      });
      
      if (error) {
        console.error('Erreur lors de l\'annulation:', error);
        // Restaurer la liste en cas d'erreur
        setNotifications(previousNotifications);
        toast.error('Erreur lors de l\'annulation : ' + error.message);
      } else {
        console.log('✅ Notification annulée avec succès');
        // Forcer une actualisation pour s'assurer de la cohérence
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Erreur inattendue lors de l\'annulation:', err);
      toast.error('Erreur inattendue lors de l\'annulation');
      await fetchNotifications();
    } finally {
      setProcessing(null);
    }
  };

  console.log("[ADMIN DEBUG] PaymentsToVerify RENDER");
  return (
    <div className="min-h-screen bg-white pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paiements à vérifier</h1>
          <button
            className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
            onClick={() => window.history.back()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
            <span>Retour</span>
          </button>
        </div>
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="bg-white border border-orange-200 rounded-lg shadow-sm px-8 py-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{notifications.length}</div>
          <div className="text-sm text-gray-600">Paiements à vérifier</div>
        </div>
      </div>
      {loading && (
        <div className="text-center p-8 bg-white rounded-lg">
          <p className="text-gray-500">Chargement des paiements...</p>
        </div>
      )}
      {error && (
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <p className="text-red-500">Erreur : {error}</p>
        </div>
      )}
      {!loading && !error && notifications.length === 0 && (
        <div className="text-center p-8 bg-white rounded-lg">
          <p className="text-gray-500">Aucun paiement à vérifier.</p>
        </div>
      )}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <AdminPaymentNotificationCard
              key={notif.notification_id}
              id={notif.notification_id}
              amount={parseFloat(notif.total_amount)}
              notifiedAt={notif.notified_at}
              userName={notif.user_full_name || notif.user_username || notif.user_email}
              userEmail={notif.user_email}
              onConfirm={() => handleValidate(notif.notification_id)}
              onDelete={() => handleCancel(notif.notification_id)}
              processing={processing === notif.notification_id}
            />
          ))}
        </div>
      )}
    </div>
  </main>
</div>

  );
};

export default PaymentsToVerify;
