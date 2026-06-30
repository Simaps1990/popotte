import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SyncEventType, SupabaseEventPayload } from '../services/syncTypes';
import { toast } from 'react-hot-toast';
import { logger } from '../lib/logger';

/**
 * Hook personnalisé pour gérer l'abonnement aux mises à jour des produits, catégories et variantes de stock
 * Centralise les abonnements pour éviter les duplications
 * @param onProductUpdate Callback appelé lors d'une mise à jour de produit
 * @param onCategoryUpdate Callback appelé lors d'une mise à jour de catégorie
 * @returns Un objet avec un flag indiquant la dernière mise à jour
 */
export function useProductSubscription(
  onProductUpdate?: () => void,
  onCategoryUpdate?: () => void
) {
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const productChannelRef = useRef<any>(null);
  const categoryChannelRef = useRef<any>(null);
  const stockVariantChannelRef = useRef<any>(null);

  // Mise à jour instantanée sans délai
  const handleProductUpdate = (payload: SupabaseEventPayload) => {
    const now = Date.now();
    const eventType = payload.eventType;
    const id = payload.new?.id || payload.old?.id;
    logger.debug('⚡ [useProductSubscription] Mise à jour produit instantanée:', eventType, id);
    
    // Notification toast
    if (eventType === 'UPDATE') {
      toast.success('Produit mis à jour', { duration: 2000 });
    } else if (eventType === 'INSERT') {
      toast.success('Nouveau produit ajouté', { duration: 2000 });
    } else if (eventType === 'DELETE') {
      toast.success('Produit supprimé', { duration: 2000 });
    }
    
    // Mise à jour immédiate sans délai
    setLastUpdate(now);
    if (onProductUpdate) onProductUpdate();
  };

  const handleCategoryUpdate = (payload: SupabaseEventPayload) => {
    const now = Date.now();
    const eventType = payload.eventType;
    const id = payload.new?.id || payload.old?.id;
    logger.debug('⚡ [useProductSubscription] Mise à jour catégorie instantanée:', eventType, id);
    
    // Notification toast
    if (eventType === 'UPDATE') {
      toast.success('Catégorie mise à jour', { duration: 2000 });
    } else if (eventType === 'INSERT') {
      toast.success('Nouvelle catégorie ajoutée', { duration: 2000 });
    } else if (eventType === 'DELETE') {
      toast.success('Catégorie supprimée', { duration: 2000 });
    }
    
    // Mise à jour immédiate sans délai
    setLastUpdate(now);
    if (onCategoryUpdate) onCategoryUpdate();
  };

  const handleStockVariantUpdate = (payload: SupabaseEventPayload) => {
    const now = Date.now();
    const eventType = payload.eventType;
    const id = payload.new?.id || payload.old?.id;
    logger.debug('⚡ [useProductSubscription] Mise à jour variante de stock instantanée:', eventType, id);
    
    // Notification toast
    if (eventType === 'UPDATE') {
      toast.success('Variante de stock mise à jour', { duration: 2000 });
    } else if (eventType === 'INSERT') {
      toast.success('Nouvelle variante de stock ajoutée', { duration: 2000 });
    } else if (eventType === 'DELETE') {
      toast.success('Variante de stock supprimée', { duration: 2000 });
    }
    
    // Mise à jour immédiate sans délai
    setLastUpdate(now);
    if (onProductUpdate) onProductUpdate();
  };

  useEffect(() => {
    logger.debug('🔄 Initialisation des abonnements centralisés aux produits, catégories et variantes de stock');
    
    // S'assurer qu'il n'y a pas déjà des abonnements actifs
    if (productChannelRef.current) {
      logger.debug('🔄 Désabonnement de l\'ancien abonnement produits');
      productChannelRef.current.unsubscribe();
      productChannelRef.current = null;
    }
    
    if (categoryChannelRef.current) {
      logger.debug('🔄 Désabonnement de l\'ancien abonnement catégories');
      categoryChannelRef.current.unsubscribe();
      categoryChannelRef.current = null;
    }
    
    if (stockVariantChannelRef.current) {
      logger.debug('🔄 Désabonnement de l\'ancien abonnement variantes de stock');
      stockVariantChannelRef.current.unsubscribe();
      stockVariantChannelRef.current = null;
    }
    
    // Créer un nouvel abonnement pour les produits
    const productChannel = supabase.channel('global_product_changes_' + Date.now())
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'products'
        }, 
        (payload: any) => {
          logger.debug('📡 [useProductSubscription] Changement de produit détecté:', payload.eventType, payload.new?.id || payload.old?.id);
          handleProductUpdate(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('🔊 [useProductSubscription] Statut abonnement produits:', status);
      });
    
    // Créer un nouvel abonnement pour les catégories
    const categoryChannel = supabase.channel('global_category_changes_' + Date.now())
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'categories'
        }, 
        (payload: any) => {
          logger.debug('📡 [useProductSubscription] Changement de catégorie détecté:', payload.eventType, payload.new?.id || payload.old?.id);
          handleCategoryUpdate(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('🔊 [useProductSubscription] Statut abonnement catégories:', status);
      });
    
    // Créer un nouvel abonnement pour les variantes de stock
    const stockVariantChannel = supabase.channel('global_stock_variant_changes_' + Date.now())
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'product_stock_variants'
        }, 
        (payload: any) => {
          logger.debug('📡 [useProductSubscription] Changement de variante de stock détecté:', payload.eventType, payload.new?.id || payload.old?.id);
          handleStockVariantUpdate(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('🔊 [useProductSubscription] Statut abonnement variantes de stock:', status);
      });
    
    // Stocker les références aux canaux
    productChannelRef.current = productChannel;
    categoryChannelRef.current = categoryChannel;
    stockVariantChannelRef.current = stockVariantChannel;
    
    // Nettoyage lors du démontage du composant
    return () => {
      logger.debug('🧹 Nettoyage des abonnements aux produits, catégories et variantes de stock');
      if (productChannelRef.current) {
        productChannelRef.current.unsubscribe();
        productChannelRef.current = null;
      }
      
      if (categoryChannelRef.current) {
        categoryChannelRef.current.unsubscribe();
        categoryChannelRef.current = null;
      }
      
      if (stockVariantChannelRef.current) {
        stockVariantChannelRef.current.unsubscribe();
        stockVariantChannelRef.current = null;
      }
    };
  }, []);
  
  return { lastUpdate };
}
