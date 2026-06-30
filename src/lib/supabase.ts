import { supabase } from './supabaseClient';
import { logger } from './logger';

// Réexporter le client Supabase
export { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  display_order: number;
  category_id: string;
  category_name?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  slug: string;
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  published: boolean;
  author_id: string;
  excerpt?: string | null;
}

/**
 * Désactive la vérification d'email en développement
 */
export const disableEmailConfirmation = () => {
  if (import.meta.env.DEV) {
    // @ts-ignore - Propriété interne
    supabase.auth.admin = supabase.auth.admin || {};
    // @ts-ignore - Propriété interne
    supabase.auth.admin.generateLink = async () => ({
      data: { user: { email: 'test@example.com' }, properties: {} },
      error: null,
    });
  }
};

/**
 * Vérifie si une table existe dans la base de données
 * @param tableName Nom de la table à vérifier
 * @returns true si la table existe, false sinon
 */
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    // Essayer de récupérer les informations de la table via l'API Supabase
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Si on a une erreur 42P01, la table n'existe pas
    if (error && (error.code === '42P01' || error.message.includes('relation'))) {
      return false;
    }
    
    // Autre erreur, on la propage
    if (error) throw error;
    
    // Si on arrive ici, la table existe
    return true;
  } catch (error) {
    logger.error('Erreur lors de la vérification de la table:', error);
    return false;
  }
};

/**
 * Vérifie et initialise la structure de la base de données
 * @returns État de la structure de la base de données
 */
export const checkDatabaseStructure = async (): Promise<{
  debtsTableExists: boolean;
  getDebtsFunctionExists: boolean;
}> => {
  const result = {
    debtsTableExists: false,
    getDebtsFunctionExists: false,
  };

  try {
    // Vérifier si la table debts existe
    result.debtsTableExists = await tableExists('debts');
    


    // Vérifier si la fonction get_user_debts existe
    // On utilise une requête SQL directe pour vérifier si la fonction existe
    try {
      const { data, error } = await supabase.rpc('get_user_debts', { 
        user_id_param: '00000000-0000-0000-0000-000000000000' 
      });
      
      // Si on arrive ici, la fonction existe (même si elle échoue avec un mauvais paramètre)
      if (error) {
        // Si l'erreur est liée à un UUID invalide, c'est que la fonction existe
        if (!error.message.includes('invalid input value for type uuid') && 
            !error.message.includes('no function matches the given name and argument types')) {
          throw error;
        }
      }
      
      result.getDebtsFunctionExists = true;
    } catch (error) {
      // La fonction RPC 'get_user_debts' n'existe pas ou n'est pas accessible
    }

    return result;
  } catch (error) {
    logger.error('Erreur lors de la vérification de la structure de la base de données:', error);
    return result;
  }
};

/**
 * Récupère les dernières actualités publiées (NOUVELLE VERSION - BYPASS RPC)
 * @param limit Nombre maximum d'actualités à récupérer (par défaut: 3)
 * @returns Liste des actualités
 */
export const getNews = async (limit = 3): Promise<NewsPost[]> => {
  logger.debug('🚀 getNews - VERSION SIMPLIFIÉE - ACCÈS DIRECT');
  logger.debug('🔍 getNews - Paramètres:', { limit });
  
  try {
    // Requête directe simple avec timeout
    logger.debug('🎯 getNews - Requête directe avec timeout de 3s...');
    
    const queryPromise = supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout 3s')), 3000)
    );
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (!error && data && data.length > 0) {
      logger.debug('✅ getNews - Succès:', data.length, 'actualités');
      return data;
    }
    
    throw new Error('Pas de données ou erreur');
    
  } catch (error) {
    logger.debug('⚡ getNews - Fallback activé');
    
    // Retourner un tableau vide si Supabase échoue
    return [];
  }
};

/**
 * Crée une nouvelle commande (version simplifiée)
 * @param orderData Données de la commande
 * @returns La commande créée
 */
// Import pour la création de dette
import { DebtStatus } from '../types/debt';

export const createOrder = async (orderData: {
  user_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  total_amount: number;
  status?: string;
}): Promise<any> => {
  try {
    logger.debug('Création de la commande avec les données:', {
      user_id: orderData.user_id,
      total_amount: orderData.total_amount,
      status: orderData.status || 'en_attente',
      items: orderData.items
    });

    // 1. Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        total_amount: orderData.total_amount,
        status: orderData.status || 'en_attente',
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Erreur lors de la création de la commande:', orderError);
      throw orderError;
    }

    if (!order) {
      throw new Error('Aucune donnée de commande retournée');
    }

    logger.debug('Commande créée avec succès:', order);

    // 2. Ajouter les articles de la commande
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    logger.debug('Insertion des articles de commande:', orderItems);

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select('*');

    if (itemsError) {
      logger.error('Erreur lors de l\'ajout des articles:', itemsError);
      throw itemsError;
    }

    logger.debug('Articles ajoutés avec succès:', items);
    
    // 3. Créer une dette associée à la commande (pour tout statut de commande)
    try {
      logger.debug('Création de la dette associée à la commande:', order.id);
      
      const debtItems = items?.map((item: {
        product_id: string;
        quantity: number;
        unit_price: number;
        products?: { name: string };
      }) => ({
        id: item.product_id,
        name: item.products?.name || 'Produit',
        quantity: item.quantity,
        unitPrice: item.unit_price
      })) || [];
      
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .insert({
          user_id: orderData.user_id,
          order_id: order.id,
          amount: orderData.total_amount,
          status: DebtStatus.UNPAID,
          items: debtItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (debtError) {
        logger.error('Erreur lors de la création de la dette:', debtError);
        // On ne rejette pas l'erreur pour ne pas bloquer la création de commande
        // mais on la log pour pouvoir la tracer
      } else {
        logger.debug('Dette créée avec succès pour la commande:', order.id);
        
        // Émettre un événement broadcast pour notifier tous les clients
        // Cela permet de s'assurer que les abonnements temps réel sont déclenchés
        if (debtData) {
          try {
            const broadcastResult = await supabase
              .from('debts')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', debtData.id);
              
            logger.debug('📢 Broadcast de mise à jour pour la dette créée via commande:', broadcastResult);
          } catch (broadcastError) {
      logger.warn('Erreur lors du broadcast de la dette (non bloquant):', broadcastError);
          }
        }
      }
    } catch (debtError) {
      logger.error('Erreur inattendue lors de la création de la dette:', debtError);
      // On ne rejette pas l'erreur pour ne pas bloquer la création de commande
    }

    // 4. Retourner la commande complète avec les articles
    return {
      ...order,
      items: items || []
    };
  } catch (error) {
    logger.error('Erreur dans createOrder:', error);
    throw error;
  }
};

/**
 * Récupère la liste des catégories de produits
 * @returns Liste des catégories
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    logger.debug('🔄 [getCategories] Forçage du rechargement des données catégories sans cache');
    // Ajouter un timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    const { data, error } = await supabase
      .from('categories')
      .select(`*`)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Erreur lors de la récupération des catégories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Erreur inattendue lors de la récupération des catégories:', error);
    return [];
  }
};

/**
 * Récupère la liste des produits
 * @param categoryId ID de la catégorie pour filtrer (optionnel)
 * @param includeUnavailable Si true, inclut également les produits indisponibles (is_available=false)
 * @returns Liste des produits
 */
export const getProducts = async (categoryId?: string, includeUnavailable: boolean = false): Promise<Product[]> => {
  try {
    logger.debug('🔄 [getProducts] Forçage du rechargement des données produits sans cache');
    // Première méthode : essayer avec la jointure
    try {
      // Ajouter un timestamp pour éviter le cache
      const timestamp = new Date().getTime();
      let query = supabase
        .from('products')
        .select(`*, categories!inner(*)`);
      
      // Filtrer par disponibilité seulement si includeUnavailable est false
      if (!includeUnavailable) {
        query = query.eq('is_available', true);
      }
      
      query = query.order('display_order', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Utiliser l'option head: false pour forcer un rechargement complet
      const { data, error } = await query;

      if (!error && data) {
        return data.map((product: any) => ({
          ...product,
          category_name: product.categories?.name,
        }));
      }
    } catch (joinError) {
      // Erreur avec la jointure, tentative sans jointure
    }

    // Si la jointure échoue, essayer sans jointure
    let query = supabase
      .from('products')
      .select('*');
      
    // Filtrer par disponibilité seulement si includeUnavailable est false
    if (!includeUnavailable) {
      query = query.eq('is_available', true);
    }
      
    query = query.order('display_order', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Erreur lors de la récupération des produits:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Erreur inattendue lors de la récupération des produits:', error);
    return [];
  }
};

/**
 * Vérifie et crée la table user_debts si elle n'existe pas
 */
const ensureDebtsTableExists = async (): Promise<void> => {
  try {
    // Vérifier si la table existe déjà
    const { data: tableExists } = await supabase
      .from('user_debts')
      .select('*')
      .limit(1);
    
    // Si la requête réussit, la table existe déjà
    if (tableExists !== null) return;
    
    // La table user_debts n'existe pas. Elle doit être créée dans Supabase.
    // On ne crée pas la table automatiquement car elle nécessite des permissions spéciales
    // L'administrateur doit la créer manuellement avec la bonne structure
    throw new Error('La table user_debts n\'existe pas. Veuillez la créer dans Supabase.');
  } catch (error) {
    // On propage l'erreur pour que l'utilisateur soit informé
    throw error;
  }
};

/**
 * Récupère les dettes d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Liste des dettes de l'utilisateur
 */
export const fetchUserDebts = async (userId: string): Promise<any[]> => {
  try {
    // Essayer d'abord avec user_debts
    try {
      const { data, error } = await supabase
        .from('user_debts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'unpaid');
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      logger.warn("Erreur avec user_debts, tentative avec debts...", error);
    }

    // Si user_debts échoue, essayer avec debts
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'unpaid');
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des dettes:', error);
    }
    
    return [];
  } catch (error) {
    logger.error('Erreur inattendue lors de la récupération des dettes:', error);
    return [];
  }
};
