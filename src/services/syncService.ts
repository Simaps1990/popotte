import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { SyncEventType, SyncCallback, SupabaseEventPayload, SyncEventPayload, SupabaseChannel } from './syncTypes';

// Réexporter les types pour les utilisateurs du service
export type { SyncEventType, SyncCallback, SupabaseEventPayload, SyncEventPayload, SupabaseChannel } from './syncTypes';

/**
 * Service centralisé pour la gestion des synchronisations temps réel
 * Permet de garantir une synchronisation cohérente entre les différentes pages
 */

// Stockage des callbacks enregistrés par type d'événement
const syncCallbacks: Record<SyncEventType, SyncCallback[]> = {
  product_change: [],
  category_change: [],
  order_change: []
};

// Canaux Supabase actifs
const activeChannels: Record<string, any> = {};

/**
 * Initialise le service de synchronisation
 */
export const initSyncService = () => {
  console.log('🚀 [SyncService] Initialisation du service de synchronisation');
  
  // Écouter les événements de broadcast pour les changements de produits
  subscribeToProductChanges();
};

/**
 * S'abonne aux changements de produits via Supabase Realtime
 */
export const subscribeToProductChanges = () => {
  const channelId = 'global_product_changes_' + Date.now();
  
  const channel = supabase.channel(channelId)
    .on('postgres_changes', 
      { 
        event: '*',
        schema: 'public',
        table: 'products'
      }, 
      (payload: any) => {
        console.log('📡 [SyncService] Changement de produit détecté:', payload.eventType, payload.new?.id || payload.old?.id);
        
        // Notifier tous les callbacks enregistrés
        notifyCallbacks('product_change', {
          type: payload.eventType,
          id: payload.new?.id || payload.old?.id,
          data: payload.new || payload.old
        });
      }
    )
    .subscribe((status: string) => {
      console.log('🔊 [SyncService] Statut abonnement produits:', status);
    });
  
  activeChannels[channelId] = channel;
  return channelId;
};

/**
 * S'abonne aux changements de catégories via Supabase Realtime
 */
export const subscribeToCategoryChanges = () => {
  const channelId = 'global_category_changes_' + Date.now();
  
  const channel = supabase.channel(channelId)
    .on('postgres_changes', 
      { 
        event: '*',
        schema: 'public',
        table: 'categories'
      }, 
      (payload: any) => {
        console.log('📡 [SyncService] Changement de catégorie détecté:', payload.eventType, payload.new?.id || payload.old?.id);
        
        // Notifier tous les callbacks enregistrés
        notifyCallbacks('category_change', {
          type: payload.eventType,
          id: payload.new?.id || payload.old?.id,
          data: payload.new || payload.old
        });
      }
    )
    .subscribe((status: string) => {
      console.log('🔊 [SyncService] Statut abonnement catégories:', status);
    });
  
  activeChannels[channelId] = channel;
  return channelId;
};

/**
 * Enregistre un callback pour un type d'événement
 * @param eventType Type d'événement
 * @param callback Fonction à appeler lors de l'événement
 * @returns ID unique pour désabonnement
 */
export const registerSyncCallback = (eventType: SyncEventType, callback: SyncCallback): string => {
  const callbackId = Date.now().toString();
  
  if (!syncCallbacks[eventType]) {
    syncCallbacks[eventType] = [];
  }
  
  syncCallbacks[eventType].push(callback);
  console.log(`✅ [SyncService] Callback enregistré pour ${eventType}`);
  
  return callbackId;
};

/**
 * Notifie tous les callbacks enregistrés pour un type d'événement
 * @param eventType Type d'événement
 * @param payload Données de l'événement
 */
const notifyCallbacks = (eventType: SyncEventType, payload: any) => {
  if (!syncCallbacks[eventType]) return;
  
  console.log(`🔔 [SyncService] Notification de ${syncCallbacks[eventType].length} callbacks pour ${eventType}`);
  
  syncCallbacks[eventType].forEach(callback => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`❌ [SyncService] Erreur lors de l'exécution d'un callback ${eventType}:`, error);
    }
  });
};

/**
 * Notifie tous les abonnés d'un événement
 * @param eventType Type d'événement
 * @param payload Données associées à l'événement
 */
export const notifySubscribers = (eventType: SyncEventType, payload: any): void => {
  const callbacks = syncCallbacks[eventType] || [];
  callbacks.forEach(callback => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`Erreur lors de l'exécution du callback pour ${eventType}:`, error);
    }
  });
};

/**
 * Diffuse un changement de produit à tous les abonnés
 * @param eventType Type d'événement (INSERT, UPDATE, DELETE)
 * @param productId ID du produit concerné
 * @param data Données supplémentaires (optionnel)
 */
export const broadcastProductChange = (eventType: string, productId: string, data?: any): void => {
  console.log('🔄 [SyncService] Diffusion changement produit:', eventType, productId);
  notifySubscribers('product_change', { 
    type: eventType, 
    id: productId,
    data
  });
};

/**
 * Diffuse un changement de catégorie à tous les abonnés
 * @param eventType Type d'événement (INSERT, UPDATE, DELETE)
 * @param categoryId ID de la catégorie concernée
 * @param data Données supplémentaires (optionnel)
 */
export const broadcastCategoryChange = (eventType: string, categoryId: string, data?: any): void => {
  console.log('🔄 [SyncService] Diffusion changement catégorie:', eventType, categoryId);
  notifySubscribers('category_change', { 
    type: eventType, 
    id: categoryId,
    data
  });
};

/**
 * Nettoie les abonnements et callbacks
 */
export const cleanupSyncService = () => {
  console.log('🧹 [SyncService] Nettoyage du service de synchronisation');
  
  // Désabonner tous les canaux actifs
  Object.values(activeChannels).forEach((channel: any) => {
    if (channel && channel.unsubscribe) {
      channel.unsubscribe();
    }
  });
  
  // Vider les callbacks
  Object.keys(syncCallbacks).forEach(key => {
    syncCallbacks[key as SyncEventType] = [];
  });
};

// Initialiser le service au chargement
initSyncService();
