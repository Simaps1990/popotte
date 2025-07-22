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

// Récupère l'utilisateur connecté avec son profil (mise à jour)
export const getCurrentUserWithProfile = async (): Promise<{
  user: User | null;
  profile: UserProfile | null;
  error: Error | null;
}> => {
  try {
    console.log('🔍 Récupération de l\'utilisateur actuel...');
    
    // 1. Récupérer l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Aucun utilisateur connecté ou erreur:', userError);
      return { 
        user: null, 
        profile: null, 
        error: userError || new Error('Utilisateur non connecté') 
      };
    }

    console.log('🔑 Utilisateur connecté:', user.email);
    
    // 2. Récupérer le profil depuis la vue sécurisée
    console.log('🔍 Récupération du profil depuis la vue sécurisée...');
    const { data: profile, error: profileError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Erreur lors de la récupération du profil:', profileError);
      console.log('⚠️ Tentative de récupération depuis la table profiles standard...');
      
      // Fallback sur la table profiles standard si la vue échoue
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (fallbackError) {
        console.error('❌ Échec de la récupération du profil de secours:', fallbackError);
        return { user, profile: null, error: profileError };
      }
      
      console.log('✅ Profil récupéré depuis la table de secours');
      return { user, profile: fallbackProfile, error: null };
    }

    console.log('✅ Profil récupéré avec succès:', profile);
    return { user, profile, error: null };
    
  } catch (error) {
    console.error('❌ Erreur inattendue dans getCurrentUserWithProfile:', error);
    return { 
      user: null, 
      profile: null, 
      error: error instanceof Error ? error : new Error('Erreur inconnue') 
    };
  }
};

export const updateProfile = async (updates: Partial<UserProfile>) => {
  console.log('🔄 Début de la mise à jour du profil avec les données:', updates);
  
  // 1. Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    const errorMsg = userError?.message || 'Utilisateur non connecté';
    console.error('❌ Erreur d\'authentification:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`🆔 Mise à jour du profil pour l'utilisateur: ${user.email} (${user.id})`);
  
  // 2. Préparer les données à mettre à jour
  const profileUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  console.log('📝 Données à mettre à jour:', profileUpdates);
  
  try {
    // Mise à jour directe dans la table profiles standard
    console.log('🔄 Mise à jour directe dans la table profiles...');
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)
      .select()
      .single();
        
    if (error) {
      console.error('❌ Échec de la mise à jour du profil:', error);
      throw error;
    }
    
    console.log('✅ Profil mis à jour avec succès');
    return data;
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error);
    throw error;
  }
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  console.log('🔒 Début du changement de mot de passe...');
  
  // 1. Vérifier que l'utilisateur est connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    const errorMsg = userError?.message || 'Utilisateur non connecté';
    console.error('❌ Erreur d\'authentification:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`🔑 Utilisateur authentifié: ${user.email}`);
  
  try {
    // 2. Vérifier le mot de passe actuel
    console.log('🔍 Vérification du mot de passe actuel...');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      console.error('❌ Mot de passe actuel incorrect');
      throw new Error('Le mot de passe actuel est incorrect');
    }

    console.log('✅ Mot de passe actuel vérifié avec succès');
    
    // 3. Mettre à jour le mot de passe
    console.log('🔄 Mise à jour du mot de passe...');
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateError);
      throw updateError;
    }

    console.log('✅ Mot de passe mis à jour avec succès');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erreur lors du changement de mot de passe:', error);
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
