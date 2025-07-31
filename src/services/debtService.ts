import { supabase } from '../lib/supabaseClient';
import { DebtStatus, UserDebt, DebtSummary } from '../types/debt';

export const debtService = {
  // Récupérer toutes les dettes d'un utilisateur
  async getUserDebts(userId: string): Promise<UserDebt[]> {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user debts:', error);
      return [];
    }
  },

  // Récupérer le résumé des dettes d'un utilisateur
  async getDebtSummary(userId: string): Promise<DebtSummary> {
    const debts = await this.getUserDebts(userId);
    
    const summary: DebtSummary = {
      totalUnpaid: 0,
      totalPending: 0,
      totalPaid: 0,
      debts: []
    };

    debts.forEach(debt => {
      if (debt.status === DebtStatus.UNPAID) {
        summary.totalUnpaid += debt.amount;
      } else if (debt.status === DebtStatus.PENDING) {
        summary.totalPending += debt.amount;
      } else if (debt.status === DebtStatus.PAID) {
        summary.totalPaid += debt.amount;
      }
    });

    summary.debts = debts;
    return summary;
  },

  // Récupérer le total global de toutes les dettes en cours de tous les utilisateurs
  async getGlobalDebtSummary(): Promise<{ totalUnpaid: number; totalPending: number; totalPaid: number }> {
    try {
      // Récupérer toutes les dettes de tous les utilisateurs avec plus de détails
      const { data: allDebts, error } = await supabase
        .from('debts')
        .select('id, amount, status, user_id, description, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const summary = {
        totalUnpaid: 0,
        totalPending: 0,
        totalPaid: 0
      };

      let unpaidCount = 0;
      let pendingCount = 0;
      let paidCount = 0;

      // Calculer les totaux par statut avec comptage
      allDebts?.forEach((debt: { amount: number; status: string }) => {
        const amount = Number(debt.amount) || 0;
        
        if (debt.status === 'unpaid') {
          summary.totalUnpaid += amount;
          unpaidCount++;
        } else if (debt.status === 'payment_pending') {
          summary.totalPending += amount;
          pendingCount++;
        } else if (debt.status === 'paid') {
          summary.totalPaid += amount;
          paidCount++;
        }
      });



      return summary;
    } catch (error) {
      console.error('❌ [getGlobalDebtSummary] Erreur complète:', error);
      throw error;
    }
  },

  // Marquer une dette comme payée
  async markAsPaid(debtId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ 
          status: DebtStatus.PENDING,
          updated_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        })
        .eq('id', debtId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      return false;
    }
  },

  // Confirmer un paiement (admin)
  async confirmPayment(debtId: string, adminId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ 
          status: DebtStatus.PAID,
          updated_at: new Date().toISOString(),
          confirmed_by: adminId
        })
        .eq('id', debtId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  },

  // Créer une nouvelle dette
  async createDebt(debtData: Omit<UserDebt, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserDebt | null> {
    try {
      // Préparer les données de la dette avec les champs snake_case pour Supabase
      const debtPayload = {
        user_id: debtData.userId,
        order_id: debtData.orderId,
        amount: debtData.amount,
        description: debtData.description,
        status: debtData.status,
        // Suppression des champs items et created_by qui n'existent pas dans la table debts
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Vérifier si la table debts existe
      try {
        const { count, error: countError } = await supabase
          .from('debts')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('❌ Erreur lors de la vérification de la table debts:', countError);
          if (countError.code === '42P01') {
            console.error('⚠️ La table debts n\'existe pas!');
          }
        }
      } catch (tableCheckError) {
        console.error('❌ Exception lors de la vérification de la table:', tableCheckError);
      }
      
      // Insérer la dette dans la base de données
      const { data, error } = await supabase
        .from('debts')
        .insert([debtPayload])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur Supabase lors de la création de dette:', error);
        console.error('  - Code:', error.code);
        console.error('  - Message:', error.message);
        console.error('  - Details:', error.details);
        console.error('  - Hint:', error.hint);
        throw error;
      }
      
      if (data) {
        console.log('✅ Dette créée avec succès:', data);
        
        // Émettre un événement broadcast pour notifier tous les clients
        // Cela permet de s'assurer que les abonnements temps réel sont déclenchés
        try {
          const broadcastResult = await supabase
            .from('debts')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', data.id);
            
          if (broadcastResult.error) {
            console.warn('⚠️ Erreur lors du broadcast:', broadcastResult.error);
          }
        } catch (broadcastError) {
          console.warn('⚠️ Exception lors du broadcast (non bloquant):', broadcastError);
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ Exception lors de la création de dette:', error);
      return null;
    }
  },

  /**
   * S'abonner aux mises à jour des dettes en temps réel
   * @param userId ID de l'utilisateur pour filtrer les dettes
   * @param callback Fonction appelée à chaque mise à jour
   * @returns Fonction pour se désabonner
   */
  subscribeToDebtUpdates(userId: string, callback: (payload: any) => void) {
    
    const subscription = supabase
      .channel('debts_changes')
      .on('postgres_changes', 
        { 
          event: '*',  // Tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'debts',
          filter: `user_id=eq.${userId}`
        }, 
        (payload: any) => {

          callback(payload);
        }
      )
      .subscribe();

    return () => {

      subscription.unsubscribe();
    };
  },
  
  // Supprimer une dette (admin uniquement)
  async deleteDebt(debtId: string): Promise<boolean> {
    try {
      console.log('🔥 [deleteDebt] Début de la suppression de la dette ID:', debtId);
      
      // Vérifier si la dette existe et récupérer ses informations
      const { data: debtCheck, error: checkError } = await supabase
        .from('debts')
        .select('id, order_id, amount, status')
        .eq('id', debtId);
      
      // Vérifier si des données ont été retournées
      if (checkError) {
        console.error('❌ [deleteDebt] Erreur lors de la vérification de la dette:', checkError);
        console.error('  - Code:', checkError.code);
        console.error('  - Message:', checkError.message);
        console.error('  - Details:', checkError.details);
        return false;
      }
      
      // Si aucune dette n'est trouvée ou si le tableau est vide
      if (!debtCheck || debtCheck.length === 0) {
        console.error('❌ [deleteDebt] Dette non trouvée avec l\'ID:', debtId);
        return false;
      }
      
      // Utiliser la première dette trouvée
      const debt = debtCheck[0];
      console.log('🔎 [deleteDebt] Dette trouvée:', debt);
      
      // Permettre la suppression des dettes liées à une commande
      if (debt.order_id) {
        console.log('ℹ️ [deleteDebt] Suppression d\'une dette liée à une commande:', debt.order_id);
      }
      
      // Supprimer la dette avec force=true pour s'assurer de la suppression
      console.log('💥 [deleteDebt] Tentative de suppression avec force=true...');
      const { error, count } = await supabase
        .from('debts')
        .delete({ count: 'exact' }) // Demander le nombre d'éléments supprimés
        .eq('id', debtId);

      if (error) {
        console.error('❌ [deleteDebt] Erreur lors de la suppression de la dette:', error);
        console.error('  - Code:', error.code);
        console.error('  - Message:', error.message);
        console.error('  - Details:', error.details);
        return false;
      }
      
      // Vérifier que la dette a bien été supprimée
      console.log('✅ [deleteDebt] Suppression réussie! Nombre d\'éléments supprimés:', count);
      
      // Double vérification que la dette n'existe plus
      const { data: checkAfterDelete, error: checkError2 } = await supabase
        .from('debts')
        .select('id')
        .eq('id', debtId)
        .maybeSingle();
        
      if (checkError2) {
        console.warn('⚠️ [deleteDebt] Erreur lors de la vérification post-suppression:', checkError2);
      } else if (checkAfterDelete) {
        console.error('❌ [deleteDebt] ALERTE: La dette existe toujours après suppression!');
        return false;
      } else {
        console.log('✅ [deleteDebt] Vérification OK: La dette n\'existe plus dans la base');
      }
      
      return true;
    } catch (error) {
      console.error('❌ [deleteDebt] Exception lors de la suppression de la dette:', error);
      return false;
    }
  },
  
  // Mettre à jour une dette
  async updateDebt(debtId: string, updateData: { amount?: number; description?: string }): Promise<boolean> {
    try {
      const payload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('debts')
        .update(payload)
        .eq('id', debtId);

      if (error) {
        console.error('Erreur lors de la mise à jour de la dette:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Erreur inattendue lors de la mise à jour de la dette:', error);
      return false;
    }
  }
};
