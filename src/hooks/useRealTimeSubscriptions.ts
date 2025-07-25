import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealTimeSubscriptionsProps {
  onPaymentNotificationChange?: () => void;
  onDebtChange?: () => void;
  onOrderChange?: () => void;
  onNewsChange?: () => void;
  userId?: string;
}

/**
 * Hook personnalisé pour gérer les abonnements en temps réel Supabase
 * Permet de s'abonner aux changements sur différentes tables et de déclencher des callbacks
 */
export const useRealTimeSubscriptions = ({
  onPaymentNotificationChange,
  onDebtChange,
  onOrderChange,
  onNewsChange,
  userId
}: UseRealTimeSubscriptionsProps) => {
  const subscriptionsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    console.log('🔔 Initialisation des abonnements temps réel');
    
    // Nettoyer les abonnements existants
    subscriptionsRef.current.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    subscriptionsRef.current = [];

    // Abonnement aux notifications de paiement (global pour les admins)
    if (onPaymentNotificationChange) {
      console.log('📡 Abonnement aux notifications de paiement');
      const paymentNotificationChannel = supabase
        .channel('payment_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payment_notifications'
          },
          (payload: any) => {
            console.log('🔔 Changement détecté sur payment_notifications:', payload);
            onPaymentNotificationChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(paymentNotificationChannel);
    }

    // Abonnement aux changements de dettes (spécifique à l'utilisateur)
    if (onDebtChange && userId) {
      console.log('📡 Abonnement aux dettes pour l\'utilisateur:', userId);
      const debtChannel = supabase
        .channel(`debts_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'debts',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            console.log('🔔 Changement détecté sur les dettes:', payload);
            onDebtChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(debtChannel);
    }

    // Abonnement aux changements de commandes (spécifique à l'utilisateur)
    if (onOrderChange && userId) {
      console.log('📡 Abonnement aux commandes pour l\'utilisateur:', userId);
      const orderChannel = supabase
        .channel(`orders_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            console.log('🔔 Changement détecté sur les commandes:', payload);
            onOrderChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(orderChannel);
    }

    // Abonnement aux changements de news (global)
    if (onNewsChange) {
      console.log('📡 Abonnement aux actualités');
      const newsChannel = supabase
        .channel('news_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'news'
          },
          (payload: any) => {
            console.log('🔔 Changement détecté sur les actualités:', payload);
            onNewsChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(newsChannel);
    }

    // Nettoyage lors du démontage
    return () => {
      console.log('🧹 Nettoyage des abonnements temps réel');
      subscriptionsRef.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
    };
  }, [onPaymentNotificationChange, onDebtChange, onOrderChange, onNewsChange, userId]);

  return {
    // Fonction pour forcer la reconnexion des abonnements
    reconnect: () => {
      console.log('🔄 Reconnexion forcée des abonnements temps réel');
      subscriptionsRef.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
      
      // Les abonnements seront recréés automatiquement par l'effet
    }
  };
};

/**
 * Hook pour forcer l'invalidation du cache et le rechargement des données
 * À utiliser lors des changements de page/navigation
 * Inclut un mécanisme de debounce pour éviter les invalidations multiples
 */
export const useCacheInvalidation = () => {
  // Référence pour suivre si une invalidation est en cours
  const isInvalidatingRef = useRef(false);
  // Référence pour suivre le dernier timestamp d'invalidation
  const lastInvalidationRef = useRef(0);
  // Délai minimum entre deux invalidations (en ms)
  const DEBOUNCE_DELAY = 2000; // 2 secondes

  const invalidateCache = () => {
    const now = Date.now();
    
    // Si une invalidation est déjà en cours ou si la dernière invalidation est trop récente, on ignore
    if (isInvalidatingRef.current || (now - lastInvalidationRef.current < DEBOUNCE_DELAY)) {
      console.log('🔄 Invalidation du cache ignorée (déjà en cours ou trop récente)');
      return;
    }
    
    // Marquer le début de l'invalidation
    isInvalidatingRef.current = true;
    lastInvalidationRef.current = now;
    
    console.log('🗑️ Invalidation du cache local');
    
    // Vider le cache du navigateur pour les données de l'application
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Vider le localStorage des données temporaires (si applicable)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('debts_') || key.startsWith('orders_') || key.startsWith('news_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ Cache invalidé');
    
    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      isInvalidatingRef.current = false;
    }, 100);
  };

  return { invalidateCache };
};
