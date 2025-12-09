import { supabase } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user'; // La contrainte dans la base limite les valeurs à 'admin' ou 'user'
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  debt?: number;
  debtHistory?: UserDebt[];
  orders?: UserOrder[];
  // Nous utiliserons les préfixes dans username/email pour détecter les utilisateurs supprimés
}

export interface UserDebt {
  id?: string;
  user_id: string;
  amount: number;
  description: string;
  created_at?: string;
  created_by: string;
  status: string;
  order_id?: string;
}

export interface UserOrder {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export const userService = {
  // Récupérer tous les utilisateurs avec leur solde de dette
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      // 1. Récupérer tous les utilisateurs actifs en une seule requête optimisée
      // Augmenter la limite et simplifier les filtres pour s'assurer de récupérer tous les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .not('username', 'ilike', 'SUPPRIME_%')
        .not('email', 'ilike', 'supprime_%')
        .order('username', { ascending: true })
        .limit(1000); // Augmentation de la limite pour s'assurer de récupérer tous les utilisateurs

      if (usersError) {
        console.error('Erreur lors de la récupération des utilisateurs:', usersError);
        return [];
      }

      if (!users || users.length === 0) {
        return [];
      }

      // Filtrage côté client moins restrictif
      const activeUsers = users.filter((user: UserProfile) => {
        // Vérifier que l'utilisateur a un nom d'utilisateur et un email valides
        // et qu'il n'est pas marqué comme supprimé
        return user && user.id && 
               !(user.username?.toUpperCase().includes('SUPPRIME_')) && 
               !(user.email?.toLowerCase().includes('supprime_'));
      });

      // 2. Récupérer les dettes impayées en parallèle
      const [debtsResult] = await Promise.all([
        supabase
          .from('debts')
          .select('user_id, amount')
          .eq('status', 'unpaid')
      ]);

      const { data: allDebts, error: debtsError } = debtsResult;

      if (debtsError) {
        console.error('Erreur lors de la récupération des dettes:', debtsError);
        return activeUsers.map((user: UserProfile) => ({ ...user, debt: 0 }));
      }
      
      // 3. Calculer les soldes de dettes par utilisateur (optimisé)
      const debtsByUser = new Map<string, number>();
      
      if (allDebts?.length) {
        allDebts.forEach((debt: any) => {
          if (debt && debt.user_id) { // Vérification supplémentaire
            const currentDebt = debtsByUser.get(debt.user_id) || 0;
            debtsByUser.set(debt.user_id, currentDebt + (debt.amount || 0));
          }
        });
      }
      
      // 4. Combiner les utilisateurs avec leurs soldes de dettes
      return activeUsers.map((user: UserProfile) => ({
        ...user,
        debt: Math.round((debtsByUser.get(user.id) || 0) * 100) / 100
      }));
    } catch (error) {
      console.error('Erreur inattendue dans getAllUsers:', error);
      return [];
    }
  },

  // Récupérer un utilisateur par son ID
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      // Récupérer l'utilisateur depuis la table profiles
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return null;
      }

      if (!user) return null;
      
      // Vérifier si l'utilisateur a été supprimé
      // Nous n'utilisons plus le rôle 'deleted' car il y a une contrainte CHECK dans la base
      
      // 2. Vérifier les marqueurs dans le nom d'utilisateur et l'email
      if (!user.username || !user.email) return null;
      
      if (user.username.includes('SUPPRIME_') || user.email.includes('supprime_')) {

        return null;
      }

      // Essayer de récupérer le solde de la dette
      try {
        // D'abord, essayer avec la fonction RPC
        const { data: debtData, error: rpcError } = await supabase
          .rpc('get_user_debt_balance', { user_id: userId });
        
        if (!rpcError && debtData) {
          return {
            ...user,
            debt: Array.isArray(debtData) ? (debtData[0]?.balance || 0) : 0,
            role: user.role as 'admin' | 'user'
          };
        }
        
        // Si la fonction RPC échoue, essayer avec une requête directe
        const { data: debts, error: debtsError } = await supabase
          .from('debts')
          .select('amount, status')
          .eq('user_id', userId)
          .in('status', ['unpaid', 'pending']);
          
        const totalDebt = debts && !debtsError 
          ? debts.reduce((sum: number, debt: { amount: number }) => sum + (debt.amount || 0), 0)
          : 0;
          
        return {
          ...user,
          debt: totalDebt,
          role: user.role as 'admin' | 'user'
        };
        
      } catch (error) {
        console.warn('Erreur lors du calcul de la dette, utilisation de 0:', error);
        return {
          ...user,
          debt: 0,
          role: user.role as 'admin' | 'user'
        };
      }
    } catch (error) {
      console.error('Erreur inattendue dans getUserById:', error);
      return null;
    }
  },

  // Mettre à jour le rôle d'un utilisateur de manière atomique (profil + app_metadata.roles Supabase)
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {

      
      // Utiliser la fonction RPC côté serveur pour une mise à jour atomique
      const { data: result, error: rpcError } = await supabase
        .rpc('update_user_admin_role', {
          target_user_id: userId,
          new_role: role
        });

      if (rpcError) {
        console.error('❌ [updateUserRole] Erreur RPC:', rpcError);
        return false;
      }

      if (!result || !result.success) {
        console.error('❌ [updateUserRole] Échec de la mise à jour:', result?.error || 'Erreur inconnue');
        return false;
      }

      // Retourner immédiatement sans délai
      return true;
      
    } catch (error) {
      console.error('❌ [updateUserRole] Erreur inattendue:', error);
      return false;
    }
  },

  // Ajouter une dette à un utilisateur
  async addUserDebt(debtData: {
    user_id: string;
    amount: number;
    description?: string;
    created_by: string;
  }): Promise<UserDebt | null> {
    try {
      // Validation des données
      if (!debtData.user_id) {
        console.error('Erreur: ID utilisateur manquant');
        return null;
      }

      if (isNaN(debtData.amount) || debtData.amount <= 0) {
        console.error('Erreur: Montant invalide', debtData.amount);
        return null;
      }

      // Vérifier que l'utilisateur existe
      const { data: userExists, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', debtData.user_id)
        .single();

      if (userError || !userExists) {
        console.error('Erreur: Utilisateur introuvable', debtData.user_id, userError);
        return null;
      }

      const now = new Date().toISOString();

      // Insertion avec tous les champs nécessaires
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          user_id: debtData.user_id,
          amount: debtData.amount,
          description: debtData.description || 'Dette manuelle',
          status: 'unpaid',
          created_by: debtData.created_by,
          created_at: now,
          updated_at: now
          // Pas de order_id pour une dette manuelle
          // Suppression du champ items qui pourrait causer des problèmes
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Erreur lors de l\'ajout de la dette:', error);
        return null;
      }



      // Convertir la réponse au format UserDebt
      return {
        id: data.id || '',
        user_id: data.user_id,
        amount: data.amount,
        description: data.description || '',
        created_at: data.created_at,
        created_by: data.created_by || debtData.created_by,
        status: data.status || 'unpaid',
        order_id: data.order_id
      };
    } catch (error) {
      console.error('Erreur inattendue lors de l\'ajout de la dette:', error);
      return null;
    }
  },

  // Récupérer l'historique des dettes d'un utilisateur
  async getUserDebtHistory(userId: string, onlyManual: boolean = false): Promise<UserDebt[]> {
    try {
      let query = supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Si onlyManual est true, on filtre pour n'avoir que les dettes ajoutées manuellement
      // (celles qui n'ont pas d'order_id associé)
      if (onlyManual) {
        query = query.is('order_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user debt history:', error);
      return [];
    }
  },

  // Récupérer les commandes d'un utilisateur
  async getUserOrders(userId: string): Promise<UserOrder[]> {
    try {
      // Essayer directement d'accéder aux tables
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            products (
              id,
              name,
              price
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Gestion des erreurs
      if (ordersError) {
        if (ordersError.code === '42P01') {
          console.warn('Les tables orders ou order_items n\'existent pas encore');
        } else {
          console.warn('Erreur lors de la récupération des commandes:', ordersError);
        }
        return [];
      }

      // Si pas de commandes, retourner un tableau vide
      if (!orders || orders.length === 0) {
        return [];
      }

      // Transformer les données pour correspondre à l'interface UserOrder
      return orders.map((order: UserOrder) => ({
        id: order.id,
        user_id: order.user_id,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        items: (order.items || []).map((item: {
          id: string;
          name: string;
          quantity: number;
          price: number;
        }) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      }));
    } catch (error) {
      console.error('Erreur inattendue lors de la récupération des commandes:', error);
      return [];
    }
  },

  // S'abonner aux mises à jour des utilisateurs
  subscribeToUsers(callback: (payload: any) => void): () => void {
    try {
      // ...
      const subscription = supabase
        .channel('custom-all-channel')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles' 
          },
          (payload: any) => {
            try {
              callback(payload);
            } catch (error) {
              console.error('Erreur dans le callback de subscribeToUsers:', error);
            }
          }
        )
        .subscribe();

      return () => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Erreur lors de la désinscription de subscribeToUsers:', error);
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux mises à jour des utilisateurs:', error);
      // Retourner une fonction vide en cas d'erreur
      return () => {};
    }
  },

  // S'abonner aux mises à jour des dettes d'un utilisateur
  subscribeToUserDebts(userId: string, callback: (payload: any) => void): () => void {
    try {
      
      const subscription = supabase
        .channel('custom-user-debts-channel')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'debts',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            try {

              callback(payload);
            } catch (error) {
              console.error('Erreur dans le callback de subscribeToUserDebts:', error);
            }
          }
        )
        .subscribe();

      return () => {
        try {

          subscription.unsubscribe();
        } catch (error) {
          console.error('Erreur lors de la désinscription de subscribeToUserDebts:', error);
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux mises à jour des dettes:', error);
      return () => {};
    }
  },

  // Supprimer complètement un compte utilisateur et toutes ses données associées
  async deleteUser(userId: string): Promise<boolean> {
    console.log(`🚀 [deleteUser] Début de la suppression complète de l'utilisateur ${userId}`);
    
    try {
      // 0. Vérifier si l'utilisateur existe
      const { data: userCheck, error: userCheckError } = await supabase
        .from('profiles')
        .select('id, username, email, role')
        .eq('id', userId)
        .single();
      
      if (userCheckError || !userCheck) {
        console.error('❌ [deleteUser] Utilisateur non trouvé:', userCheckError);
        return false;
      }
      
      if (!userCheck.id) {
        console.error('❌ [deleteUser] Données utilisateur incomplètes');
        return false;
      }

      // 1. Supprimer les notifications de paiement
      console.log(`🗑️ [deleteUser] Suppression des notifications de paiement pour ${userId}`);
      const { error: paymentNotificationsError } = await supabase
        .from('payment_notifications')
        .delete()
        .eq('user_id', userId);
      
      if (paymentNotificationsError) {
        console.warn('⚠️ [deleteUser] Erreur lors de la suppression des notifications de paiement:', paymentNotificationsError);
      }

      // 2. Supprimer les notifications
      console.log(`🗑️ [deleteUser] Suppression des notifications pour ${userId}`);
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      
      if (notificationsError) {
        console.warn('⚠️ [deleteUser] Erreur lors de la suppression des notifications:', notificationsError);
      }

      // 3. Supprimer les commandes
      console.log(`🗑️ [deleteUser] Suppression des commandes pour ${userId}`);
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', userId);
      
      if (ordersError) {
        console.error('❌ [deleteUser] Erreur lors de la suppression des commandes:', ordersError);
        return false;
      }

      // 4. Supprimer les dettes
      console.log(`🗑️ [deleteUser] Suppression des dettes pour ${userId}`);
      const { error: debtsError } = await supabase
        .from('debts')
        .delete()
        .eq('user_id', userId);
      
      if (debtsError) {
        console.error('❌ [deleteUser] Erreur lors de la suppression des dettes:', debtsError);
        return false;
      }

      // 5. Supprimer le profil utilisateur
      console.log(`🗑️ [deleteUser] Suppression du profil pour ${userId}`);
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('❌ [deleteUser] Erreur lors de la suppression du profil:', profileError);
        return false;
      }

      // 6. Supprimer l'utilisateur de la table auth.users
      console.log(`🗑️ [deleteUser] Suppression de l'utilisateur de auth.users pour ${userId}`);
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('❌ [deleteUser] Erreur lors de la suppression de l\'utilisateur de auth.users:', authError);
        return false;
      }

      // Vérification finale
      const { data: verifyUser, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (verifyUser) {
        console.error('❌ [deleteUser] L\'utilisateur existe toujours après la suppression');
        return false;
      }

      console.log(`✅ [deleteUser] Utilisateur ${userId} supprimé avec succès`);
      return true;
      
    } catch (error) {
      console.error('❌ [deleteUser] Erreur inattendue lors de la suppression:', error);
      return false;
    }
  }
};
