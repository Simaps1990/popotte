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
      
      const summary = await debtService.getGlobalDebtSummary();
      
      setTotalUnpaid(summary.totalUnpaid);
      setTotalPending(summary.totalPending);
    } catch (err) {
      console.error('❌ [DebtSummaryPanel] Erreur lors du chargement des dettes globales:', err);
      setError('Erreur lors du chargement des dettes');
    } finally {
      setLoading(false);
    }
  };

  // Abonnement direct aux changements de la table debts pour toutes les dettes
  useEffect(() => {
    const subscription = supabase
      .channel('global-debts-panel')
      .on('postgres_changes', {
        event: '*', // Tous les événements (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'debts'
      }, () => {
        // Attendre un court délai pour s'assurer que les changements sont propagés
        setTimeout(() => {
          fetchGlobalDebtSummary();
        }, 500);
      })
      .subscribe();

    return () => {
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
    <div className={`${className} bg-gray-50 rounded-lg p-3 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`mr-3 p-2 ${totalUnpaid > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <rect width="20" height="14" x="2" y="5" rx="2"></rect>
              <line x1="2" x2="22" y1="10" y2="10"></line>
            </svg>
          </div>
          <div>
            <h3 className="text-gray-800 font-medium text-sm">DETTES EN COURS</h3>
            <p className="text-xs text-gray-500">Total à régler par les membres</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <div className={`text-xl font-bold ${totalUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalUnpaid.toFixed(2)} €
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
