import { useState, useEffect, useRef } from 'react';
import { debtService } from '../services/debtService';

/**
 * Hook personnalisé pour gérer l'abonnement aux mises à jour des dettes
 * Centralise les abonnements pour éviter les duplications
 * @param userId ID de l'utilisateur
 * @param onUpdate Callback appelé lors d'une mise à jour
 * @returns Un objet avec un flag indiquant si une mise à jour a été reçue
 */
export function useDebtSubscription(userId: string | undefined, onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const activeSubscriptionRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Protection contre les mises à jour trop fréquentes
  const handleUpdate = () => {
    const now = Date.now();
    // Si la dernière mise à jour date de moins de 500ms, on attend
    if (now - lastUpdate < 500) {
      console.log('🛡️ Mise à jour trop rapide, debounce activé');
      
      // Annuler le timer précédent s'il existe
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Créer un nouveau timer
      debounceTimerRef.current = setTimeout(() => {
        console.log('⏱️ Debounce terminé, exécution de la mise à jour');
        setLastUpdate(Date.now());
        if (onUpdate) onUpdate();
      }, 500);
      
      return;
    }
    
    // Sinon, on met à jour immédiatement
    setLastUpdate(now);
    if (onUpdate) onUpdate();
  };

  useEffect(() => {
    // Ne s'abonner que si l'userId est défini
    if (!userId) return;
    
    console.log(`🔄 Initialisation de l'abonnement centralisé aux dettes pour l'utilisateur ${userId}`);
    
    // S'assurer qu'il n'y a pas déjà un abonnement actif
    if (activeSubscriptionRef.current) {
      console.log('🔄 Désabonnement de l\'ancien abonnement');
      activeSubscriptionRef.current();
      activeSubscriptionRef.current = null;
    }
    
    // Créer un nouvel abonnement
    const unsubscribe = debtService.subscribeToDebtUpdates(userId, (payload) => {
      console.log('📡 [useDebtSubscription] Mise à jour reçue:', payload);
      handleUpdate();
    });
    
    // Stocker la fonction de désabonnement
    activeSubscriptionRef.current = unsubscribe;
    
    // Nettoyage lors du démontage du composant
    return () => {
      console.log('🧹 Nettoyage de l\'abonnement aux dettes');
      if (activeSubscriptionRef.current) {
        activeSubscriptionRef.current();
        activeSubscriptionRef.current = null;
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [userId]);
  
  return { lastUpdate };
}
