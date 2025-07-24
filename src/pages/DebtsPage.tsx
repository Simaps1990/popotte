import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { debtService } from '../services/debtService';
import { DebtStatus, DebtSummary } from '../types/debt';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function DebtsPage() {
  const { user } = useAuth();
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDebts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const summary = await debtService.getDebtSummary(user.id);
      setDebtSummary(summary);
    } catch (err) {
      console.error('Error loading debts:', err);
      setError('Erreur lors du chargement de vos dettes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();

    // S'abonner aux mises à jour
    if (user) {
      const unsubscribe = debtService.subscribeToDebtUpdates(user.id, () => {
        loadDebts();
      });

      return () => unsubscribe();
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy \à HH:mm', { locale: fr });
  };

  const handleMarkAsPaid = async (debtId: string) => {
    if (!user) return;
    
    const success = await debtService.markAsPaid(debtId, user.id);
    if (success) {
      await loadDebts();
    } else {
      setError('Erreur lors de la mise à jour du statut du paiement');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos dettes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800">Une erreur est survenue</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button 
            onClick={loadDebts}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Mes Dettes</h1>
          </div>

          {/* Dettes non réglées */}
          {debtSummary?.totalUnpaid ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-red-600">🔴 Dettes non réglées</h2>
              
              {debtSummary.debts
                .filter(debt => debt.status === DebtStatus.UNPAID)
                .map(debt => (
                  <div key={debt.id} className="card border-l-4 border-red-500 bg-red-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">
                        {debt.createdAt ? formatDate(debt.createdAt) : 'Date inconnue'}
                      </span>
                      <span className="font-semibold text-red-600">
                        {debt.amount.toFixed(2)} €
                      </span>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {(debt.items || []).map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {item.quantity}x {item.name} - {item.unitPrice.toFixed(2)} €
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => handleMarkAsPaid(debt.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2"
                      >
                        <span>Marquer comme payé</span>
                      </button>
                    </div>
                  </div>
                ))}
              

              <div className="card bg-red-50 border-red-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total à régler :</span>
                  <span className="text-xl font-bold text-red-600">
                    {debtSummary.totalUnpaid.toFixed(2)} €
                  </span>
                </div>
                
                <div className="space-y-3">
                  <a
                    href="https://paypal.me/popotte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <span>Régler mes dettes</span>
                  </a>
                  
                  <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2">
                    <span>Notifier mon paiement aux popottiers</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Dettes en attente de confirmation */}
          {debtSummary?.debts.some(d => d.status === DebtStatus.PENDING) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-orange-600">🟠 Dettes en attente de confirmation</h2>
              
              {debtSummary.debts
                .filter(debt => debt.status === DebtStatus.PENDING)
                .map(debt => (
                  <div key={debt.id} className="card border-l-4 border-orange-500 bg-orange-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">
                        Commande: {debt.createdAt ? formatDate(debt.createdAt) : 'Date inconnue'}
                      </span>
                      <span className="font-semibold text-orange-600">
                        {debt.amount.toFixed(2)} €
                      </span>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {(debt.items || []).map((item, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {item.quantity}x {item.name} - {item.unitPrice.toFixed(2)} €
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-sm text-orange-700 font-medium bg-orange-100 p-2 rounded">
                      ⏳ En attente de confirmation par les popottiers
                    </div>
                  </div>
                ))}
            </div>
          )}


          {!debtSummary?.debts.length && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-5xl mb-4">💸</div>
              <h3 className="text-lg font-medium text-gray-700">Aucune dette pour le moment</h3>
              <p className="text-gray-500 mt-1">Vos commandes apparaîtront ici</p>
              <Link 
                to="/commande" 
                className="mt-4 inline-block px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Passer une commande
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
