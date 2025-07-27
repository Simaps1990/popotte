import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { debtService } from '../../services/debtService';
import { DebtStatus } from '../../types/debt';

export default function UsersList() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDebts, setUserDebts] = useState<Record<string, { unpaid: number; pending: number }>>({});

  const loadUsers = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Chargement des utilisateurs...');
      const usersData = await userService.getAllUsers();
      console.log(`${usersData.length} utilisateurs récupérés`);
      
      if (usersData.length === 0) {
        console.warn('Aucun utilisateur récupéré, vérifiez la fonction getAllUsers');
        setError('Aucun utilisateur trouvé. Veuillez réessayer ou contacter le support.');
        return;
      }
      
      setUsers(usersData);
      
      // Charger les dettes pour chaque utilisateur avec optimisation
      console.log('Chargement des dettes pour chaque utilisateur...');
      const debtsMap: Record<string, { unpaid: number; pending: number }> = {};
      
      // Initialiser la map pour tous les utilisateurs
      usersData.forEach(user => {
        debtsMap[user.id] = { unpaid: 0, pending: 0 };
      });
      
      // Charger les dettes en parallèle pour améliorer les performances
      await Promise.all(usersData.map(async (user) => {
        try {
          const debts = await debtService.getUserDebts(user.id);
          
          if (debts && debts.length > 0) {
            debtsMap[user.id] = {
              unpaid: debts
                .filter(d => d.status === DebtStatus.UNPAID)
                .reduce((sum, debt) => sum + debt.amount, 0),
              pending: debts
                .filter(d => d.status === DebtStatus.PENDING)
                .reduce((sum, debt) => sum + debt.amount, 0)
            };
          }
        } catch (error) {
          console.error(`Erreur lors du chargement des dettes pour l'utilisateur ${user.id}:`, error);
          // Ne pas bloquer le chargement des autres utilisateurs en cas d'erreur
        }
      }));
      
      console.log('Dettes chargées avec succès');
      setUserDebts(debtsMap);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const success = await userService.updateUserRole(userId, newRole);
      if (success) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ));
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Erreur lors de la mise à jour du rôle');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#10182a]">Utilisateurs</h2>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="min-w-0 flex-1 flex items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-primary-600 truncate">
                            {user.username || user.email}
                          </p>
                          {userDebts[user.id]?.unpaid > 0 && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
                              {userDebts[user.id].unpaid.toFixed(2)} €
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-white">
                          <p>{user.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0 flex flex-col items-end">
                    {/* Affichage des dettes */}
                    {userDebts[user.id]?.unpaid > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                        Dette: {userDebts[user.id].unpaid.toFixed(2)} €
                      </span>
                    )}
                    {userDebts[user.id]?.pending > 0 && (
                      <span className="mt-1 px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
                        En attente: {userDebts[user.id].pending.toFixed(2)} €
                      </span>
                    )}
                    
                    {/* Bouton de changement de rôle */}
                    {user.role === 'admin' ? (
                      <button
                        onClick={() => handleRoleChange(user.id, 'user')}
                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Rétrograder
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(user.id, 'admin')}
                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-[#10182a] hover:bg-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a2a3a]"
                      >
                        Promouvoir Admin
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 flex justify-between">
                  <div className="flex items-center text-sm text-white">
                    <p>Inscrit le {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
