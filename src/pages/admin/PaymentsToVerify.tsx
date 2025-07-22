import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AdminPaymentNotificationCard from "../../components/admin/AdminPaymentNotificationCard";

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

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("rpc_payments_to_verify");
    console.log("[ADMIN DEBUG] Résultat RPC:", data, "Erreur:", error);
    if (error) setError(error.message);
    else setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, []);

  const handleValidate = async (notification_id: string) => {
    setProcessing(notification_id);
    const { error } = await supabase.rpc("validate_payment_notification", {
      notif_id: notification_id,
    });
    if (error) alert("Erreur validation : " + error.message);
    await fetchNotifications();
    setProcessing(null);
  };

  const handleCancel = async (notification_id: string) => {
    setProcessing(notification_id);
    const { error } = await supabase.rpc("cancel_payment_notification", {
      notif_id: notification_id,
    });
    if (error) alert("Erreur annulation : " + error.message);
    await fetchNotifications();
    setProcessing(null);
  };

  console.log("[ADMIN DEBUG] PaymentsToVerify RENDER");
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Paiements à vérifier</h1>
          <button
            className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
            onClick={() => window.history.back()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
            <span>Retour</span>
          </button>
        </div>
        <div className="space-y-6 mt-6">
          <div className="card text-center mb-6">
            <div className="text-2xl font-bold text-orange-600">{notifications.length}</div>
            <div className="text-sm text-gray-600">Paiements à vérifier</div>
          </div>
          {loading && <div>Chargement...</div>}
          {error && <div className="text-red-600">Erreur : {error}</div>}
          {Array.isArray(notifications) && notifications.length === 0 && !loading ? (
            <div className="text-gray-500">Aucun paiement à vérifier.</div>
          ) : Array.isArray(notifications) && notifications.length > 0 ? (
            <ul className="space-y-4">
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
            </ul>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default PaymentsToVerify;
