import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { debtService } from '../services/debtService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface PendingDebtSummaryPanelProps {
  className?: string;
}

export function PendingDebtSummaryPanel({ className = '' }: PendingDebtSummaryPanelProps) {
  const { user } = useAuth();
  const [totalPending, setTotalPending] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer le total des dettes à vérifier
  const fetchPendingDebtSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [PendingDebtSummaryPanel] Récupération des dettes à vérifier');
      
      const summary = await debtService.getGlobalDebtSummary();
      
      console.log('📊 [PendingDebtSummaryPanel] Total dettes à vérifier:', summary.totalPending, '€');
      
      setTotalPending(summary.totalPending);
      
      console.log('✅ [PendingDebtSummaryPanel] État mis à jour avec succès');
    } catch (err) {
      console.error('❌ [PendingDebtSummaryPanel] Erreur lors du chargement des dettes à vérifier:', err);
      setError('Erreur lors du chargement des dettes à vérifier');
    } finally {
      setLoading(false);
    }
  };

  // Abonnement aux changements de la table debts pour les dettes pending
  useEffect(() => {
    console.log('🔄 [PendingDebtSummaryPanel] Configuration de l\'abonnement aux dettes à vérifier');
    
    const subscription = supabase
      .channel('pending-debts-panel')
      .on('postgres_changes', {
        event: '*', // Tous les événements (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'debts'
      }, (payload: any) => {
        console.log('🔄 [PendingDebtSummaryPanel] Changement détecté dans les dettes');
        console.log('🔄 [PendingDebtSummaryPanel] Type:', payload.eventType);
        
        // Rechargement après un court délai
        setTimeout(() => {
          fetchPendingDebtSummary();
        }, 500);
      })
      .subscribe();

    return () => {
      console.log('🚫 [PendingDebtSummaryPanel] Désabonnement des dettes à vérifier');
      subscription.unsubscribe();
    };
  }, []);
  
  // Chargement initial des données
  useEffect(() => {
    fetchPendingDebtSummary();
  }, []);

  if (!user) {
    return null; // Ne rien afficher si l'utilisateur n'est pas connecté
  }

  return (
    <div className={`${className} bg-gray-50 rounded-lg p-3 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`mr-3 p-2 ${totalPending > 0 ? 'bg-orange-100' : 'bg-gray-100'} rounded-lg`}>
            <Clock className={`h-5 w-5 ${totalPending > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="text-gray-800 font-medium text-sm">DETTES À VÉRIFIER</h3>
            <p className="text-xs text-gray-500">En attente de validation</p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <div className={`text-xl font-bold ${totalPending > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
              {totalPending.toFixed(2)} €
            </div>
          )}
          {totalPending === 0 && !loading && !error && (
            <div className="text-xs text-gray-500 mt-1">
              Aucune dette en attente
            </div>
          )}
        </div>
      </div>
      {totalPending > 0 && <div className="h-1 w-full bg-orange-200 mt-3"><div className="h-1 bg-orange-500" style={{width: '100%'}}></div></div>}
      {totalPending === 0 && <div className="h-1 w-full bg-gray-200 mt-3"><div className="h-1 bg-gray-500" style={{width: '100%'}}></div></div>}
    </div>
  );
}
