import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// Constantes pour la gestion des reconnexions
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 secondes entre les tentatives
const HEALTH_CHECK_INTERVAL = 30000; // 30 secondes

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
  const [isConnected, setIsConnected] = useState(true);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Surveiller la connectivité du navigateur
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Navigateur en ligne, reconnexion des abonnements...');
      setIsConnected(true);
      reconnectSubscriptions();
    };
    
    const handleOffline = () => {
      console.log('⚠️ Navigateur hors ligne, abonnements suspendus');
      setIsConnected(false);
    };
    
    // Surveiller les changements de visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible, vérification des abonnements...');
        // Vérifier l'état des abonnements après un court délai
        setTimeout(() => {
          reconnectSubscriptions();
        }, 500);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  // Compteur de tentatives de reconnexion
  const reconnectAttemptsRef = useRef<number>(0);
  // Timestamp de la dernière reconnexion réussie
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());
  // Référence au timer de vérification de santé
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fonction sécurisée pour créer les abonnements
  const createSubscriptions = useCallback(() => {
    try {
      console.log('🔌 Création/recréation des abonnements temps réel...');
      
      // Nettoyer les abonnements existants
      subscriptionsRef.current.forEach(subscription => {
        try {
          supabase.removeChannel(subscription);
        } catch (error) {
          console.warn('⚠️ Erreur lors du nettoyage d\'un abonnement:', error);
        }
      });
      subscriptionsRef.current = [];

    // Abonnement aux notifications de paiement (global pour les admins)
    if (onPaymentNotificationChange) {
      const paymentNotificationChannel = supabase
        .channel('payment_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payment_notifications'
          },
          () => {
            onPaymentNotificationChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(paymentNotificationChannel);
    }

    // Abonnement aux changements de dettes (spécifique à l'utilisateur)
    if (onDebtChange && userId) {
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
          () => {
            onDebtChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(debtChannel);
    }

    // Abonnement aux changements de commandes (spécifique à l'utilisateur)
    if (onOrderChange && userId) {
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
          () => {
            onOrderChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(orderChannel);
    }

    // Abonnement aux changements de news (global)
    if (onNewsChange) {
      const newsChannel = supabase
        .channel('news_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'news'
          },
          () => {
            onNewsChange();
          }
        )
        .subscribe();
      
      subscriptionsRef.current.push(newsChannel);
    }

    } catch (error) {
      console.error('❌ Erreur lors de la création des abonnements:', error);
      // Planifier une nouvelle tentative
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        console.log('🔄 Nouvelle tentative de création des abonnements...');
        createSubscriptions();
      }, 3000);
    }
  };
  
  // Fonction pour vérifier l'état de santé des abonnements
  const checkSubscriptionsHealth = useCallback(() => {
    try {
      // Si aucun abonnement n'est attendu, ne rien faire
      if (!onPaymentNotificationChange && !onDebtChange && !onOrderChange && !onNewsChange) {
        return;
      }
      
      // Vérifier si les abonnements sont actifs
      const allActive = subscriptionsRef.current.length > 0 && 
        subscriptionsRef.current.every(subscription => subscription.state === 'joined');
      
      // Vérifier si le nombre d'abonnements correspond à ce qui est attendu
      const expectedSubscriptions = [
        onPaymentNotificationChange, 
        onDebtChange && userId, 
        onOrderChange && userId, 
        onNewsChange
      ].filter(Boolean).length;
      
      const hasCorrectSubscriptionCount = subscriptionsRef.current.length === expectedSubscriptions;
      
      if (!allActive || !hasCorrectSubscriptionCount) {
        console.warn(`⚠️ Problème détecté avec les abonnements: ${subscriptionsRef.current.length}/${expectedSubscriptions} actifs`);        
        reconnectSubscriptions();
      } else {
        console.log('✅ Tous les abonnements sont actifs et en bonne santé');
        // Réinitialiser le compteur de tentatives si tout va bien
        reconnectAttemptsRef.current = 0;
        lastSuccessfulConnectionRef.current = Date.now();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de santé des abonnements:', error);
      reconnectSubscriptions();
    }
  }, [onPaymentNotificationChange, onDebtChange, onOrderChange, onNewsChange, userId]);
  
  // Fonction pour reconnecter les abonnements de façon sécurisée
  const reconnectSubscriptions = useCallback(() => {
    try {
      // Limiter le nombre de tentatives de reconnexion
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`❌ Échec après ${MAX_RECONNECT_ATTEMPTS} tentatives de reconnexion. Attente prolongée avant nouvel essai.`);
        
        // Réinitialiser après un délai plus long
        setTimeout(() => {
          reconnectAttemptsRef.current = 0;
          createSubscriptions();
        }, RECONNECT_DELAY * 5);
        
        return;
      }
      
      reconnectAttemptsRef.current++;
      console.log(`🔄 Tentative de reconnexion #${reconnectAttemptsRef.current}...`);
      
      // Vérifier si les abonnements sont actifs
      const allActive = subscriptionsRef.current.every(subscription => 
        subscription.state === 'joined'
      );
      
      if (!allActive || subscriptionsRef.current.length === 0) {
        console.log('🔌 Abonnements inactifs ou manquants, reconnexion...');
        
        // Ajouter un délai progressif entre les tentatives
        setTimeout(() => {
          createSubscriptions();
        }, RECONNECT_DELAY * Math.min(reconnectAttemptsRef.current, 3));
      } else {
        console.log('✅ Tous les abonnements sont actifs');
        reconnectAttemptsRef.current = 0;
        lastSuccessfulConnectionRef.current = Date.now();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des abonnements:', error);
      
      // Réessayer après un délai
      setTimeout(() => {
        createSubscriptions();
      }, RECONNECT_DELAY);
    }
  }, [createSubscriptions]);
  
  // Configurer une vérification périodique de santé des abonnements
  useEffect(() => {
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
    }
    
    healthCheckTimerRef.current = setInterval(() => {
      if (isConnected) {
        checkSubscriptionsHealth();
      }
    }, HEALTH_CHECK_INTERVAL);
    
    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [checkSubscriptionsHealth, isConnected]);
  
  // Effet pour créer les abonnements
  useEffect(() => {
    if (isConnected) {
      createSubscriptions();
    }
    
    // Nettoyage lors du démontage
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
      
      subscriptionsRef.current.forEach(subscription => {
        try {
          supabase.removeChannel(subscription);
        } catch (error) {
          console.warn('⚠️ Erreur lors du nettoyage d\'un abonnement:', error);
        }
      });
      subscriptionsRef.current = [];
    };
  }, [onPaymentNotificationChange, onDebtChange, onOrderChange, onNewsChange, userId, isConnected, createSubscriptions]);

  return {
    // Fonction pour forcer la reconnexion des abonnements
    reconnect: () => {
      console.log('🔄 Reconnexion forcée des abonnements...');
      // Réinitialiser le compteur de tentatives pour une reconnexion forcée
      reconnectAttemptsRef.current = 0;
      reconnectSubscriptions();
    },
    // Vérifier l'état de santé des abonnements
    checkHealth: checkSubscriptionsHealth,
    // Exposer l'état de connexion
    isConnected
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
      console.log('🔄 Invalidation du cache ignorée (trop récente ou déjà en cours)');
      return;
    }
    
    // Marquer le début de l'invalidation
    isInvalidatingRef.current = true;
    lastInvalidationRef.current = now;
    console.log('🧹 Début de l\'invalidation du cache...');
    
    
    // Vider UNIQUEMENT les caches liés aux données métier, pas les caches d'authentification
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          // Ne pas supprimer les caches liés à l'authentification
          if (!name.includes('auth') && !name.includes('session') && !name.includes('user')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Vider le localStorage des données temporaires (si applicable) - SAUF données d'authentification
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Ne supprimer QUE les clés liées aux données métier, pas les données d'authentification
      if (key && (key.startsWith('debts_') || key.startsWith('orders_') || key.startsWith('news_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Log pour debug
    console.log(`🧹 Cache invalidé sélectivement (${keysToRemove.length} clés supprimées)`)
    
    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      isInvalidatingRef.current = false;
    }, 100);
  };

  return { invalidateCache };
};
