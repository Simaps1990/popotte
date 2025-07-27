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
        console.log('Aucun utilisateur trouvé');
        return [];
      }

      console.log(`${users.length} utilisateurs récupérés de la base de données`);

      // Filtrage côté client moins restrictif
      const activeUsers = users.filter((user: UserProfile) => {
        // Vérifier que l'utilisateur a un nom d'utilisateur et un email valides
        // et qu'il n'est pas marqué comme supprimé
        return user && user.id && 
               !(user.username?.toUpperCase().includes('SUPPRIME_')) && 
               !(user.email?.toLowerCase().includes('supprime_'));
      });

      console.log(`${activeUsers.length} utilisateurs actifs après filtrage`);

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
      
      console.log(`${allDebts?.length || 0} dettes impayées récupérées`);
      
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

  // Mettre à jour le rôle d'un utilisateur (profil + app_metadata.roles Supabase)
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      // 1. Mettre à jour le champ 'role' dans profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (profileError) {
        console.error('❌ Erreur lors de la mise à jour du rôle dans profiles:', profileError);
        return false;
      }

      // 2. Mettre à jour le champ roles dans app_metadata de auth.users
      // Récupérer l'utilisateur actuel
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id, raw_app_meta_data')
        .eq('id', userId)
        .single();
      if (userError || !userData) {
        console.error('❌ Erreur lors de la récupération de l’utilisateur dans auth.users:', userError);
        return false;
      }

      let appMeta = userData.raw_app_meta_data || {};
      let roles: string[] = [];
      if (Array.isArray(appMeta.roles)) {
        roles = appMeta.roles;
      } else if (typeof appMeta.roles === 'string') {
        try {
          roles = JSON.parse(appMeta.roles);
        } catch {
          roles = [];
        }
      }

      if (role === 'admin') {
        // Ajouter admin si pas déjà présent
        if (!roles.includes('admin')) roles.push('admin');
      } else {
        // Retirer admin si présent
        roles = roles.filter(r => r !== 'admin');
      }

      // Nettoyage des doublons (sécurité)
      roles = Array.from(new Set(roles));

      // Mise à jour de l'app_metadata
      const newAppMeta = { ...appMeta, roles };
      const { error: metaError } = await supabase
        .from('auth.users')
        .update({ raw_app_meta_data: newAppMeta })
        .eq('id', userId);
      if (metaError) {
        console.error('❌ Erreur lors de la mise à jour de app_metadata.roles:', metaError);
        return false;
      }

      console.log(`✅ Rôle '${role}' synchronisé (profil + app_metadata) pour user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la mise à jour du rôle:', error);
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

      console.log('Dette ajoutée avec succès:', data);

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
      console.log(` Abonnement aux mises à jour des dettes pour l'utilisateur ${userId} (userService)`);
      
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
              console.log(' Mise à jour de dette reçue dans userService:', payload);
              callback(payload);
            } catch (error) {
              console.error('Erreur dans le callback de subscribeToUserDebts:', error);
            }
          }
        )
        .subscribe((status: string) => {
          console.log(`Statut de l'abonnement aux dettes (userService): ${status}`);
        });

      return () => {
        try {
          console.log(' Désabonnement des mises à jour des dettes (userService)');
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
        

        
        // Essayer d'abord le soft delete (plus fiable avec les contraintes FK)

        
        const timestamp = Date.now();
        const newUsername = `SUPPRIME_${timestamp}_${userId.substring(0, 8)}`;
        const newEmail = `supprime_${timestamp}@deleted.user`;
        

        
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

              return true;
            }
          }
        } else {

          
          // Vérifier que la mise à jour a bien été appliquée
          const { data: checkUser, error: checkError } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', userId)
            .maybeSingle();
          
          if (checkError) {

          } else if (checkUser) {

            if (!checkUser.username.includes('SUPPRIME_') || 
                !checkUser.email.includes('supprime_')) {
              console.warn('ATTENTION: La mise à jour ne semble pas avoir été correctement appliquée!');
              return false;
            } else {

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
