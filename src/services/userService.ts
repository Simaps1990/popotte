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
      console.log('Début de la récupération des utilisateurs');
      
      console.log('Tentative de récupération des utilisateurs depuis Supabase...');
      
      // 1. Récupérer d'abord tous les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true })
        .limit(1000); // Limite élevée pour s'assurer de récupérer tous les utilisateurs

      if (usersError) {
        console.error('Erreur lors de la récupération des utilisateurs:', usersError);
        console.error('Détails de l\'erreur:', JSON.stringify(usersError));
        return [];
      }

      console.log(`Utilisateurs récupérés avec succès (avant filtrage): ${users?.length || 0}`);
      
      if (!users || users.length === 0) {
        console.warn('Aucun utilisateur trouvé dans la base de données');
        return [];
      }

      // Filtrage côté client pour exclure les utilisateurs supprimés
      console.log('Filtrage des utilisateurs supprimés...');
      
      // Log détaillé de tous les utilisateurs avant filtrage
      console.log('LISTE COMPLÈTE DES UTILISATEURS AVANT FILTRAGE:');
      users.forEach((user: UserProfile) => {
        console.log(`ID: ${user.id}, Username: ${user.username || 'NON DÉFINI'}, Email: ${user.email || 'NON DÉFINI'}, Role: ${user.role || 'NON DÉFINI'}, Created: ${user.created_at}`);
      });
      
      const activeUsers = users.filter((user: UserProfile) => {
        // Vérifier si l'utilisateur est marqué comme supprimé
        if (!user.username || !user.email) {
          console.log(`EXCLU: Utilisateur sans username ou email: ${user.id}`);
          return false;
        }
        
        // Vérifier les préfixes de suppression dans username et email
        const isDeleted = 
          user.username.toUpperCase().includes('SUPPRIME_') || 
          user.email.toLowerCase().includes('supprime_');
        
        if (isDeleted) {
          console.log(`EXCLU: Utilisateur supprimé détecté: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
          return false;
        }
        
        console.log(`INCLUS: Utilisateur actif: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        return true;
      });
      
      console.log(`Filtrage terminé: ${users.length - activeUsers.length} utilisateur(s) exclus, ${activeUsers.length} utilisateur(s) actifs retenus`);
      
      // Afficher les IDs des utilisateurs actifs pour faciliter le débogage
      console.log('Liste des IDs des utilisateurs actifs après filtrage:', 
        activeUsers.map((u: UserProfile) => u.id).join(', '));


      // 2. Récupérer les dettes impayées pour tous les utilisateurs depuis la table 'debts'
      const { data: allDebts, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('status', 'unpaid');

      if (debtsError) {
        console.error('Erreur lors de la récupération des dettes:', debtsError);
      }

      // 3. Organiser les dettes par utilisateur
      const debtsByUser: Record<string, UserDebt[]> = {};
      const debtTotalByUser: Record<string, number> = {};
      
      if (allDebts && Array.isArray(allDebts)) {
        allDebts.forEach((debt: UserDebt) => {
          // Initialiser les tableaux et totaux si nécessaire
          if (!debtsByUser[debt.user_id]) debtsByUser[debt.user_id] = [];
          if (!debtTotalByUser[debt.user_id]) debtTotalByUser[debt.user_id] = 0;
          
          // Ajouter la dette à la liste des dettes de l'utilisateur
          debtsByUser[debt.user_id].push(debt);
          
          // Ajouter le montant de la dette au total de l'utilisateur
          debtTotalByUser[debt.user_id] += debt.amount || 0;
        });
      }
      // Retourner les utilisateurs actifs avec leurs dettes
      return activeUsers.map((user: UserProfile) => ({
        ...user,
        debt: debtTotalByUser[user.id] || 0,
        debtHistory: debtsByUser[user.id] || []
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
        console.log(`Utilisateur ${userId} a été supprimé (marqueurs dans username/email), retourne null`);
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

  // Ajouter une dette à un utilisateur
  async addUserDebt(debtData: {
    user_id: string;
    amount: number;
    description?: string;
    created_by: string; // On garde ce paramètre pour la compatibilité mais on ne l'utilise pas dans l'insertion
  }): Promise<UserDebt | null> {
    try {
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          user_id: debtData.user_id,
          amount: debtData.amount,
          description: debtData.description || 'Dette',
          status: 'unpaid'
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
        created_by: data.created_by,
        status: data.status || 'unpaid'
      };
    } catch (error) {
      console.error('Erreur inattendue lors de l\'ajout de la dette:', error);
      return null;
    }
  },

  // Récupérer l'historique des dettes d'un utilisateur
  async getUserDebtHistory(userId: string): Promise<UserDebt[]> {
    try {
      // Récupérer les dettes depuis la table 'debts' au lieu de 'user_debts'
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération de l\'historique des dettes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des dettes:', error);
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
      console.warn('Erreur inattendue lors de la récupération des commandes, retour d\'un tableau vide:', error);
      return [];
    }
  },

  // Mettre à jour le rôle d'un utilisateur
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) {
        console.error('Erreur lors de la mise à jour du rôle:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erreur inattendue lors de la mise à jour du rôle:', error);
      return false;
    }
  },

  // S'abonner aux mises à jour des utilisateurs
  subscribeToUsers(callback: (payload: any) => void): () => void {
    try {
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
            table: 'user_debts',
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
      // Retourner une fonction vide en cas d'erreur
      return () => {};
    }
  },

  // Supprimer un compte utilisateur
  async deleteUser(userId: string): Promise<boolean> {
    console.log(`===== DÉBUT SUPPRESSION UTILISATEUR ${userId} =====`);
    try {
      // 0. Vérifier si l'utilisateur existe
      const { data: userCheck, error: userCheckError } = await supabase
        .from('profiles')
        .select('id, username, email, role')
        .eq('id', userId)
        .single();
      
      if (userCheckError || !userCheck) {
        console.error('Erreur ou utilisateur non trouvé:', userCheckError);
        return false;
      }
      
      // Vérifier que userCheck est bien défini et a les propriétés attendues
      if (!userCheck.id || !userCheck.username || !userCheck.email) {
        console.error('Données utilisateur incomplètes:', userCheck);
        return false;
      }
      
      console.log(`Utilisateur trouvé: ID=${userCheck.id}, Username=${userCheck.username}, Email=${userCheck.email}, Role=${userCheck.role || 'non défini'}`);
      
      // 1. Gérer les dettes de l'utilisateur
      try {
        // Marquer toutes les dettes comme payées plutôt que de les supprimer
        const { data: debtsData, error: debtsUpdateError } = await supabase
          .from('debts')
          .update({ status: 'paid' })
          .eq('user_id', userId)
          .select();
        
        if (debtsUpdateError) {
          console.error('Erreur lors de la mise à jour des dettes:', debtsUpdateError);
          // On continue malgré cette erreur
        } else {
          console.log(`Dettes marquées comme payées avec succès: ${debtsData?.length || 0} dettes mises à jour`);
        }
      } catch (err) {
        console.warn('Erreur lors de la gestion des dettes:', err);
      }

      // 2. Supprimer les commandes de l'utilisateur si nécessaire
      try {
        // D'abord compter les commandes pour le log
        const { count: orderCount, error: countError } = await supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('user_id', userId);
          
        console.log(`Nombre de commandes à supprimer: ${orderCount || 0}`);
        
        // Ensuite supprimer
        const { error: ordersError } = await supabase
          .from('orders')
          .delete()
          .eq('user_id', userId);

        if (ordersError) {
          console.error('Erreur lors de la suppression des commandes:', ordersError);
        } else {
          console.log(`Commandes supprimées avec succès: ${orderCount || 0} commandes`);
        }
      } catch (err) {
        console.warn('Erreur lors de la tentative de suppression des commandes:', err);
      }

      // 3. Tenter directement la suppression physique (plus fiable)
      console.log('Tentative de suppression physique du profil utilisateur');
      try {
        // Vérifier d'abord s'il existe des contraintes FK qui empêcheraient la suppression
        const { count: relatedDebts } = await supabase
          .from('debts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
          
        const { count: relatedOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        console.log(`Relations existantes: ${relatedDebts || 0} dettes, ${relatedOrders || 0} commandes`);
        
        // Essayer d'abord le soft delete (plus fiable avec les contraintes FK)
        console.log('Tentative de soft delete (méthode principale)');
        
        const timestamp = Date.now();
        const newUsername = `SUPPRIME_${timestamp}_${userId.substring(0, 8)}`;
        const newEmail = `supprime_${timestamp}@deleted.user`;
        
        console.log(`Tentative de soft delete avec: Username=${newUsername}, Email=${newEmail}`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            username: newUsername,
            email: newEmail,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select();
        
        if (updateError) {
          console.error('Erreur lors du soft delete:', updateError);
          console.error('Détails:', JSON.stringify(updateError));
          
          // Si le soft delete échoue, on essaie la suppression physique
          console.log('Tentative alternative: suppression physique');
          
          // Force la suppression en cascade si possible
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
          
          if (deleteError) {
            console.error('Erreur lors de la suppression physique:', deleteError);
            console.error('Détails:', JSON.stringify(deleteError));
            return false;
          } else {
            console.log('Suppression physique réussie');
            
            // Double vérification pour s'assurer que l'utilisateur a bien été supprimé
            await new Promise(resolve => setTimeout(resolve, 500)); // Attendre un peu pour la propagation
            
            const { data: checkUser, error: checkError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle(); // Utiliser maybeSingle au lieu de single pour éviter l'erreur
            
            if (checkUser) {
              console.warn('ATTENTION: L\'utilisateur existe toujours après suppression!');
              return false;
            } else {
              console.log('Vérification OK: utilisateur correctement supprimé physiquement');
              return true;
            }
          }
        } else {
          console.log('Soft delete réussi:', updateData);
          
          // Vérifier que la mise à jour a bien été appliquée
          const { data: checkUser, error: checkError } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', userId)
            .maybeSingle();
          
          if (checkError) {
            console.log('Erreur lors de la vérification post-update:', checkError);
          } else if (checkUser) {
            console.log('État après mise à jour:', checkUser);
            if (!checkUser.username.includes('SUPPRIME_') || 
                !checkUser.email.includes('supprime_')) {
              console.warn('ATTENTION: La mise à jour ne semble pas avoir été correctement appliquée!');
              return false;
            } else {
              console.log('Vérification OK: utilisateur correctement marqué comme supprimé');
              return true;
            }
          }
          
          return true;
        }
      } catch (error: any) {
        console.error('Erreur inattendue lors de la suppression:', error);
        return false;
      }
    } catch (err) {
      console.error('Erreur globale lors de la suppression:', err);
      return false;
    } finally {
      console.log(`===== FIN SUPPRESSION UTILISATEUR ${userId} =====`);
    }
  }
};
