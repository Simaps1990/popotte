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
      console.log('Création de dette avec les données:', debtData);
      
      // Préparer les données de la dette avec les champs snake_case pour Supabase
      const debtPayload = {
        user_id: debtData.userId,
        order_id: debtData.orderId,
        amount: debtData.amount,
        description: debtData.description,
        status: debtData.status,
        items: debtData.items || [],
        created_by: debtData.created_by || debtData.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Payload formaté pour insertion:', debtPayload);
      
      // Insérer la dette dans la base de données
      const { data, error } = await supabase
        .from('debts')
        .insert([debtPayload])
        .select()
        .single();

      if (error) {
        console.error('Erreur Supabase lors de la création de dette:', error);
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
            
          console.log('📢 Broadcast de mise à jour pour la dette:', broadcastResult);
        } catch (broadcastError) {
          console.warn('Erreur lors du broadcast de la dette (non bloquant):', broadcastError);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error creating debt:', error);
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
    console.log(`🔔 Abonnement aux mises à jour des dettes pour l'utilisateur ${userId}`);
    
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
          console.log('📡 Mise à jour de dette reçue:', payload);
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        console.log(`Statut de l'abonnement aux dettes: ${status}`);
      });

    return () => {
      console.log('🔕 Désabonnement des mises à jour des dettes');
      subscription.unsubscribe();
    };
  },
  
  // Supprimer une dette (admin uniquement)
  async deleteDebt(debtId: string): Promise<boolean> {
    try {
      // Vérifier si la dette existe et récupérer ses informations
      const { data: debtCheck, error: checkError } = await supabase
        .from('debts')
        .select('id, order_id')
        .eq('id', debtId);
      
      // Vérifier si des données ont été retournées
      if (checkError) {
        console.error('Erreur lors de la vérification de la dette:', checkError);
        return false;
      }
      
      // Si aucune dette n'est trouvée ou si le tableau est vide
      if (!debtCheck || debtCheck.length === 0) {
        console.error('Dette non trouvée avec l\'ID:', debtId);
        return false;
      }
      
      // Utiliser la première dette trouvée
      const debt = debtCheck[0];
      
      // Si la dette est liée à une commande, ne pas autoriser la suppression
      if (debt.order_id) {
        console.error('Impossible de supprimer une dette liée à une commande');
        return false;
      }
      
      // Supprimer la dette
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId);

      if (error) {
        console.error('Erreur lors de la suppression de la dette:', error);
        return false;
      }
      
      console.log('Dette supprimée avec succès:', debtId);
      return true;
    } catch (error) {
      console.error('Erreur inattendue lors de la suppression de la dette:', error);
      return false;
    }
  }
};
