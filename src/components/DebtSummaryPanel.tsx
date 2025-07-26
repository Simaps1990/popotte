import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { debtService } from '../services/debtService';
import { useAuth } from '../contexts/AuthContext';
import { DebtStatus } from '../types/debt';

interface DebtSummaryPanelProps {
  className?: string;
}

export function DebtSummaryPanel({ className = '' }: DebtSummaryPanelProps) {
  const { user } = useAuth();
  const [totalUnpaid, setTotalUnpaid] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer le résumé des dettes
  const fetchDebtSummary = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🔄 DebtSummaryPanel - Chargement du résumé des dettes');
      
      const summary = await debtService.getDebtSummary(user.id);
      setTotalUnpaid(summary.totalUnpaid);
      
      console.log('✅ DebtSummaryPanel - Résumé des dettes chargé:', summary);
    } catch (err) {
      console.error('❌ DebtSummaryPanel - Erreur lors du chargement des dettes:', err);
      setError('Erreur lors du chargement des dettes');
    } finally {
      setLoading(false);
    }
  };

  // S'abonner aux mises à jour des dettes
  useEffect(() => {
    if (!user) return;

    console.log('🔔 DebtSummaryPanel - Initialisation de l\'abonnement aux dettes');
    
    // Charger les données initiales
    fetchDebtSummary();
    
    // S'abonner aux mises à jour en temps réel
    const unsubscribe = debtService.subscribeToDebtUpdates(user.id, (payload) => {
      console.log('🔔 DebtSummaryPanel - Mise à jour de dette reçue:', payload);
      fetchDebtSummary(); // Recharger les données à chaque mise à jour
    });
    
    // Nettoyer l'abonnement lors du démontage
    return () => {
      console.log('🧹 DebtSummaryPanel - Nettoyage de l\'abonnement aux dettes');
      unsubscribe();
    };
  }, [user]);

  if (!user) {
    return null; // Ne rien afficher si l'utilisateur n'est pas connecté
  }

  return (
    <div className={`card border-l-4 ${totalUnpaid > 0 ? 'border-red-500' : 'border-green-500'} ${className}`}>
      <div className="flex items-center space-x-4 p-4">
        <div className={`w-12 h-12 ${totalUnpaid > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
          <CreditCard className={`${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Total des dettes en cours</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Chargement...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <p className={`text-lg font-bold ${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalUnpaid.toFixed(2)} €
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
