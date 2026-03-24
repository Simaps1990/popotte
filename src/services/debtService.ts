import { supabase } from '../lib/supabaseClient';
import { DebtStatus, Debt, DebtSummary } from '../types/debt';

const normalizeDebtStatus = (status?: string | null): DebtStatus => {
  switch (status) {
    case DebtStatus.UNPAID:
      return DebtStatus.UNPAID;
    case 'pending':
    case DebtStatus.PAYMENT_PENDING:
      return DebtStatus.PAYMENT_PENDING;
    case DebtStatus.PAID:
      return DebtStatus.PAID;
    case DebtStatus.CANCELLED:
      return DebtStatus.CANCELLED;
    default:
      return DebtStatus.UNPAID;
  }
};

const mapDebt = (row: any): Debt => ({
  id: row.id,
  userId: row.user_id,
  user_id: row.user_id,
  orderId: row.order_id ?? null,
  order_id: row.order_id ?? null,
  amount: Number(row.amount) || 0,
  description: row.description || '',
  status: normalizeDebtStatus(row.status),
  createdAt: row.created_at,
  created_at: row.created_at,
  updatedAt: row.updated_at,
  updated_at: row.updated_at,
});

export const debtService = {
  async getUserDebts(userId: string): Promise<Debt[]> {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(mapDebt);
    } catch (error) {
      console.error('Error fetching user debts:', error);
      return [];
    }
  },

  async getDebtSummary(userId: string): Promise<DebtSummary> {
    const debts = await this.getUserDebts(userId);

    const summary: DebtSummary = {
      totalUnpaid: 0,
      totalPending: 0,
      totalPaid: 0,
      debts,
    };

    debts.forEach((debt) => {
      if (debt.status === DebtStatus.UNPAID) {
        summary.totalUnpaid += debt.amount;
      } else if (debt.status === DebtStatus.PAYMENT_PENDING) {
        summary.totalPending += debt.amount;
      } else if (debt.status === DebtStatus.PAID) {
        summary.totalPaid += debt.amount;
      }
    });

    return summary;
  },

  async getGlobalDebtSummary(): Promise<{ totalUnpaid: number; totalPending: number; totalPaid: number }> {
    try {
      const { data: allDebts, error } = await supabase
        .from('debts')
        .select('id, amount, status, user_id, description, created_at, updated_at, order_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const summary = {
        totalUnpaid: 0,
        totalPending: 0,
        totalPaid: 0,
      };

      (allDebts || []).forEach((row: any) => {
        const debt = mapDebt(row);

        if (debt.status === DebtStatus.UNPAID) {
          summary.totalUnpaid += debt.amount;
        } else if (debt.status === DebtStatus.PAYMENT_PENDING) {
          summary.totalPending += debt.amount;
        } else if (debt.status === DebtStatus.PAID) {
          summary.totalPaid += debt.amount;
        }
      });

      return summary;
    } catch (error) {
      console.error('❌ [getGlobalDebtSummary] Erreur complète:', error);
      throw error;
    }
  },

  async markAsPaid(debtId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          status: DebtStatus.PAYMENT_PENDING,
          updated_at: new Date().toISOString(),
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

  async confirmPayment(debtId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          status: DebtStatus.PAID,
          updated_at: new Date().toISOString(),
        })
        .eq('id', debtId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  },

  async createDebt(debtData: {
    userId: string;
    orderId?: string | null;
    amount: number;
    description: string;
    status?: DebtStatus;
  }): Promise<Debt | null> {
    try {
      const debtPayload = {
        user_id: debtData.userId,
        order_id: debtData.orderId ?? null,
        amount: debtData.amount,
        description: debtData.description,
        status: debtData.status ?? DebtStatus.UNPAID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('debts').insert([debtPayload]).select().single();

      if (error) {
        console.error('❌ Erreur Supabase lors de la création de dette:', error);
        throw error;
      }

      return data ? mapDebt(data) : null;
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
