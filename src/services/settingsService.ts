import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Configuration des tables
const TABLES = {
  PROFILES: 'secure_profiles',
  ORDERS: 'secure_orders'
};

export interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  role?: string;
  created_at: string;
  updated_at: string;
}

// Récupère l'utilisateur connecté avec son profil (optimisé)
export const getCurrentUserWithProfile = async (): Promise<{
  user: User | null;
  profile: UserProfile | null;
  error: Error | null;
}> => {
  try {
    // 1. Récupérer l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        user: null, 
        profile: null, 
        error: userError || new Error('Utilisateur non connecté') 
      };
    }
    
    // 2. Récupérer le profil avec fallback optimisé
    const [secureResult, standardResult] = await Promise.allSettled([
      supabase.from(TABLES.PROFILES).select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ]);

    // Utiliser le premier résultat réussi
    if (secureResult.status === 'fulfilled' && !secureResult.value.error) {
      return { user, profile: secureResult.value.data, error: null };
    }
    
    if (standardResult.status === 'fulfilled' && !standardResult.value.error) {
      return { user, profile: standardResult.value.data, error: null };
    }

    // Si les deux échouent
    const error = secureResult.status === 'rejected' ? secureResult.reason : 
                  (secureResult.value.error || new Error('Profil non trouvé'));
    return { user, profile: null, error };
    
  } catch (error) {
    return { 
      user: null, 
      profile: null, 
      error: error instanceof Error ? error : new Error('Erreur inconnue') 
    };
  }
};

export const updateProfile = async (updates: Partial<UserProfile>) => {
  // 1. Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    const errorMsg = userError?.message || 'Utilisateur non connecté';
    throw new Error(errorMsg);
  }
  
  // 2. Préparer les données à mettre à jour
  const profileUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  try {
    // Mise à jour directe dans la table profiles standard
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)
      .select()
      .single();
        
    if (error) {
      throw error;
    }
    
    return data;
    
  } catch (error) {
    throw error;
  }
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  // 1. Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    const errorMsg = userError?.message || 'Utilisateur non connecté';
    throw new Error(errorMsg);
  }
  
  try {
    // 2. Vérifier le mot de passe actuel
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Le mot de passe actuel est incorrect');
    }
    
    // 3. Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return { success: true };
    
  } catch (error) {
    throw error instanceof Error ? error : new Error('Erreur inconnue lors du changement de mot de passe');
  }
};

export const getOrderStats = async () => {
  const { data, error } = await supabase.rpc('get_sales_stats');
  
  if (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    throw error;
  }

  return data[0];
};

export const getRecentOrders = async (limit = 5) => {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`
      id,
      status,
      total_amount,
      payment_status,
      created_at,
      order_items (
        product_name,
        variant_name,
        quantity,
        unit_price
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
    .throwOnError();

  if (error) {
    console.error('Erreur lors de la récupération des commandes récentes:', error);
    throw error;
  }

  return data;
};

export const getProductStats = async () => {
  const { data, error } = await supabase
    .from('product_stats')
    .select('*')
    .order('total_quantity_sold', { ascending: false })
    .limit(5)
    .throwOnError();

  if (error) {
    console.error('Erreur lors de la récupération des statistiques des produits:', error);
    throw error;
  }

  return data;
};
