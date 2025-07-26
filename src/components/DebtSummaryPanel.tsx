import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { debtService } from '../services/debtService';
import { useAuth } from '../contexts/AuthContext';
import { DebtStatus } from '../types/debt';
import { supabase } from '../lib/supabaseClient';

interface DebtSummaryPanelProps {
  className?: string;
}

export function DebtSummaryPanel({ className = '' }: DebtSummaryPanelProps) {
  const { user } = useAuth();
  const [totalUnpaid, setTotalUnpaid] = useState<number>(0);
  const [totalPending, setTotalPending] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer le résumé global des dettes de tous les utilisateurs
  const fetchGlobalDebtSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [DebtSummaryPanel] === DÉBUT RECHARGEMENT FORCÉ ===');
      console.log('🔄 [DebtSummaryPanel] Timestamp:', new Date().toISOString());
      console.log('🔄 [DebtSummaryPanel] Valeurs actuelles - Unpaid:', totalUnpaid, '€, Pending:', totalPending, '€');
      
      const summary = await debtService.getGlobalDebtSummary();
      
      console.log('📊 [DebtSummaryPanel] Nouvelles valeurs reçues:', summary);
      console.log('📊 [DebtSummaryPanel] Mise à jour - Unpaid:', summary.totalUnpaid, '€, Pending:', summary.totalPending, '€');
      
      setTotalUnpaid(summary.totalUnpaid);
      setTotalPending(summary.totalPending);
      
      console.log('✅ [DebtSummaryPanel] État mis à jour avec succès');
      console.log('✅ [DebtSummaryPanel] === FIN RECHARGEMENT ===');
    } catch (err) {
      console.error('❌ [DebtSummaryPanel] Erreur lors du chargement des dettes globales:', err);
      setError('Erreur lors du chargement des dettes');
    } finally {
      setLoading(false);
    }
  };

  // Abonnement direct aux changements de la table debts pour toutes les dettes
  useEffect(() => {
    console.log('🔄 [DebtSummaryPanel] Configuration de l\'abonnement aux dettes globales');
    
    const subscription = supabase
      .channel('global-debts-panel')
      .on('postgres_changes', {
        event: '*', // Tous les événements (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'debts'
      }, (payload: any) => {
        console.log('🔄 [DebtSummaryPanel] === CHANGEMENT DÉTECTÉ ===');
        console.log('🔄 [DebtSummaryPanel] Type:', payload.eventType);
        console.log('🔄 [DebtSummaryPanel] Données:', payload);
        console.log('🔄 [DebtSummaryPanel] Rechargement forcé des données...');
        
        // Attendre un court délai pour s'assurer que les changements sont propagés
        setTimeout(() => {
          fetchGlobalDebtSummary();
        }, 500);
      })
      .subscribe();

    return () => {
      console.log('🚫 [DebtSummaryPanel] Désabonnement des dettes globales');
      subscription.unsubscribe();
    };
  }, []);
  
  // Chargement initial des données
  useEffect(() => {
    fetchGlobalDebtSummary();
  }, []);

  if (!user) {
    return null; // Ne rien afficher si l'utilisateur n'est pas connecté
  }

  return (
    <div className={`card border-l-4 ${totalUnpaid > 0 ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'} ${className}`}>
      <div className="flex items-center space-x-4 p-4">
        <div className={`w-12 h-12 ${totalUnpaid > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <line x1="2" x2="22" y1="10" y2="10"></line>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${totalUnpaid > 0 ? 'text-red-900' : 'text-green-900'}`}>Dettes en cours</h3>
          <p className={`text-sm ${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>Total à régler par les membres</p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <div className={`text-2xl font-bold ${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalUnpaid.toFixed(2)} €
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
