import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { userService, UserProfile, UserDebt, UserOrder } from '../../services/userService';
import { debtService } from '../../services/debtService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { DebtStatus } from '../../types/debt';

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, refreshUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [debtHistory, setDebtHistory] = useState<UserDebt[]>([]);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [debtSummary, setDebtSummary] = useState<{ totalUnpaid: number } | null>(null);
  const [loading, setLoading] = useState({
    users: true,
    userDetails: false,
    orders: false
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'hasDebt' | 'noDebt'>('all');
  const [newDebt, setNewDebt] = useState<{ amount: string; description: string }>({ amount: '', description: '' });
  const [addingDebt, setAddingDebt] = useState(false);

  const fetchUsers = useCallback(async (excludeUserId?: string) => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      setError(null);
      
      // Vider la liste actuelle pour éviter les problèmes de mise à jour
      setUsers([]);
      
      console.log('Récupération de tous les utilisateurs...');
      const users = await userService.getAllUsers();
      console.log('Utilisateurs récupérés:', users.length);
      
      if (users.length === 0) {
        console.warn('Aucun utilisateur récupéré, vérifiez la fonction getAllUsers');
        setError('Aucun utilisateur trouvé. Veuillez réessayer ou contacter le support.');
        return;
      }
      
      // Si un ID d'utilisateur est fourni à exclure (cas de suppression), on le filtre immédiatement
      const filteredUsers = excludeUserId 
        ? users.filter(user => user.id !== excludeUserId)
        : users;
      
      console.log(`Utilisateurs après filtrage: ${filteredUsers.length} ${excludeUserId ? `(exclusion de ${excludeUserId})` : ''}`);
      
      // Optimisation : traitement par lots pour éviter de surcharger l'API
      const batchSize = 10;
      const userBatches = [];
      
      for (let i = 0; i < filteredUsers.length; i += batchSize) {
        userBatches.push(filteredUsers.slice(i, i + batchSize));
      }
      
      let processedUsers: UserProfile[] = [];
      
      for (const batch of userBatches) {
        const batchResults = await Promise.all(batch.map(async (user) => {
          try {
            const debtHistory = await userService.getUserDebtHistory(user.id);
            const orders = await userService.getUserOrders(user.id);
            return { ...user, debtHistory, orders };
          } catch (error) {
            console.error(`Erreur lors du chargement des données pour l'utilisateur ${user.id}:`, error);
            // Retourner l'utilisateur sans données supplémentaires en cas d'erreur
            return { ...user, debtHistory: [], orders: [] };
          }
        }));
        
        processedUsers = [...processedUsers, ...batchResults];
        // Mise à jour progressive de l'interface utilisateur
        setUsers(currentUsers => [...currentUsers, ...batchResults]);
      }
      
      console.log(`Traitement terminé pour ${processedUsers.length} utilisateurs`);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, []);

  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      setLoading(prev => ({ ...prev, userDetails: true }));
      setError(null);
      
      const userData = await userService.getUserById(userId);
      if (userData) {
        setSelectedUser(userData);
        
        // Récupérer le résumé des dettes avec debtService pour avoir la même valeur que dans la page des dettes
        const summary = await debtService.getDebtSummary(userId);
        setDebtSummary(summary);
        
        // Récupérer uniquement les dettes ajoutées manuellement (sans order_id)
        const debts = await userService.getUserDebtHistory(userId, true);
        setDebtHistory(debts);
        
        const orders = await userService.getUserOrders(userId);
        setUserOrders(orders);
      } else {
        setError('Utilisateur non trouvé');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Erreur lors du chargement des détails utilisateur');
    } finally {
      setLoading(prev => ({ ...prev, userDetails: false }));
    }
  }, []);

  // Références pour stocker les fonctions de désabonnement
  const unsubscribeRef = React.useRef<(() => void) | null>(null);
  const unsubscribeDebtRef = React.useRef<(() => void) | null>(null);
  
  // Fonction pour s'abonner aux mises à jour des utilisateurs
  const subscribeToUserUpdates = useCallback(() => {
    console.log('Abonnement aux mises à jour des utilisateurs...');
    const unsubscribe = userService.subscribeToUsers((payload) => {
      console.log('Mise à jour des utilisateurs:', payload);
      fetchUsers();
    });
    
    // Stocker la fonction de désabonnement dans la référence
    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [fetchUsers]);
  
  // Fonction pour se désabonner temporairement
  const unsubscribeFromUserUpdates = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log('Désabonnement temporaire des mises à jour utilisateurs');
      const unsubscribe = unsubscribeRef.current;
      unsubscribeRef.current = null;
      unsubscribe();
    }
  }, []);
  
  useEffect(() => {
    fetchUsers();
    
    // S'abonner aux mises à jour des utilisateurs
    subscribeToUserUpdates();
    
    // Se désabonner lors du démontage du composant
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (unsubscribeDebtRef.current) {
        unsubscribeDebtRef.current();
      }
    };
  }, [fetchUsers, subscribeToUserUpdates]);

  useEffect(() => {
    if (!selectedUser) return;
    
    const unsubscribeDebts = userService.subscribeToUserDebts(selectedUser.id, (payload) => {
      console.log('Mise à jour des dettes:', payload);
      if (selectedUser) {
        fetchUserDetails(selectedUser.id);
      }
    });
    
    return () => {
      unsubscribeDebts();
    };
  }, [selectedUser, fetchUserDetails]);

  const subscribeToUserDebtUpdates = useCallback((userId: string) => {
    console.log(`🔔 Abonnement aux mises à jour des dettes pour l'utilisateur ${userId}`);
    
    // Se désabonner d'abord si un abonnement existe déjà
    if (unsubscribeDebtRef.current) {
      unsubscribeDebtRef.current();
      unsubscribeDebtRef.current = null;
    }
    
    // S'abonner aux mises à jour des dettes
    unsubscribeDebtRef.current = userService.subscribeToUserDebts(userId, (payload) => {
      console.log('📡 Mise à jour de dette reçue dans Users.tsx:', payload);
      
      // Rafraîchir les détails de l'utilisateur pour mettre à jour les dettes
      fetchUserDetails(userId);
    });
  }, [fetchUserDetails]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.id);
      
      // S'abonner aux mises à jour des dettes de l'utilisateur sélectionné
      subscribeToUserDebtUpdates(selectedUser.id);
    }
  }, [selectedUser?.id, fetchUserDetails, subscribeToUserDebtUpdates]);

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    fetchUserDetails(user.id);
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const success = await userService.updateUserRole(userId, newRole);
      if (success) {
        // Si c'est un succès, mettre à jour les détails de l'utilisateur
        await fetchUserDetails(userId);
        
        // Mettre également à jour la liste complète des utilisateurs pour rafraîchir les icônes
        console.log('Rafraîchissement de la liste des utilisateurs après mise à jour du rôle...');
        await fetchUsers();
        
        // Si l'utilisateur modifié est l'utilisateur courant, rafraîchir son statut admin
        // pour que les menus d'administration apparaissent immédiatement sans actualisation
        if (currentUser && userId === currentUser.id) {
          console.log('Rafraîchissement du statut admin pour l\'utilisateur courant');
          await refreshUserRole();
        }
        
        // Afficher un message de confirmation
        alert(`L'utilisateur a été ${newRole === 'admin' ? 'promu administrateur' : 'rétrogradé utilisateur'} avec succès.`);
      } else {
        alert('Erreur lors de la mise à jour du rôle.');
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
      alert('Erreur lors de la mise à jour du rôle.');
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    // Demander confirmation avant de supprimer
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce compte utilisateur ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, users: true }));
      
      console.log('Tentative de suppression de l\'utilisateur:', userId);
      
      // IMPORTANT: Se désabonner temporairement des mises à jour en temps réel
      // pour éviter que l'utilisateur supprimé ne réapparaisse dans la liste
      unsubscribeFromUserUpdates();
      
      // Supprimer l'utilisateur via le service
      const success = await userService.deleteUser(userId);
      
      if (success) {
        console.log('Suppression réussie, mise à jour de l\'interface');
        
        // Si c'est un succès, retourner à la liste des utilisateurs
        setSelectedUser(null);
        
        // Mettre à jour la liste des utilisateurs localement immédiatement
        // en excluant l'utilisateur supprimé
        setUsers(prevUsers => {
          const filteredUsers = prevUsers.filter(user => user.id !== userId);
          console.log(`Utilisateurs restants après filtrage: ${filteredUsers.length} (avant: ${prevUsers.length})`);
          return filteredUsers;
        });
        
        // Rafraîchir la liste des utilisateurs en excluant explicitement l'utilisateur supprimé
        // pour éviter qu'il ne réapparaisse si la suppression n'est pas encore propagée
        await fetchUsers(userId);
        
        // Vérifier que l'utilisateur supprimé n'est plus dans la liste
        const { data: checkUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (checkUser) {
          console.warn(`ATTENTION: L'utilisateur ${userId} existe toujours après suppression!`);
        } else {
          console.log(`Vérification OK: L'utilisateur ${userId} n'existe plus dans la base`);
        }
        
        alert('Le compte utilisateur a été supprimé avec succès.');
      } else {
        console.error('La suppression a échoué');
        alert('Erreur lors de la suppression du compte utilisateur.');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du compte utilisateur:', err);
      alert('Erreur lors de la suppression du compte utilisateur.');
    } finally {
      // Réactiver l'abonnement aux mises à jour en temps réel
      subscribeToUserUpdates();
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddDebt = async () => {
    if (!selectedUser) return;
    
    // Validation des données
    const amount = parseFloat(newDebt.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Veuillez entrer un montant valide supérieur à 0');
      return;
    }
    
    if (!newDebt.description.trim()) {
      alert('Veuillez entrer une description pour la dette');
      return;
    }
    
    try {
      setAddingDebt(true);
      
      // Ajout de la dette via le service de dette
      const result = await debtService.createDebt({
        userId: selectedUser.id,
        amount: parseFloat(newDebt.amount),
        description: newDebt.description,
        status: DebtStatus.UNPAID
      });
      
      if (result) {
        console.log('Dette ajoutée avec succès:', result);
        
        // Réinitialiser le formulaire
        setNewDebt({ amount: '', description: '' });
        
        // Rafraîchir les détails de l'utilisateur
        await fetchUserDetails(selectedUser.id);
        
        // Notification de succès
        alert(`Dette de ${parseFloat(newDebt.amount).toFixed(2)} € ajoutée avec succès à ${selectedUser.username}`);
      } else {
        alert('Erreur lors de l\'ajout de la dette. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la dette:', err);
      alert('Une erreur est survenue lors de l\'ajout de la dette.');
    } finally {
      setAddingDebt(false);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dette ?')) {
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, debt: true }));
      
      // Appeler le service pour supprimer la dette
      const result = await debtService.deleteDebt(debtId);
      
      if (result === true) {
        // Rafraîchir les détails de l'utilisateur
        if (selectedUser) {
          await fetchUserDetails(selectedUser.id);
        }
      } else if (result === false) {
        // La dette n'a pas pu être supprimée, mais nous ne savons pas pourquoi
        // Rafraîchir les détails pour vérifier si la dette existe toujours
        if (selectedUser) {
          await fetchUserDetails(selectedUser.id);
        }
        alert('Impossible de supprimer cette dette. Elle est peut-être liée à une commande ou a déjà été supprimée.');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de la dette:', err);
      alert('Une erreur est survenue lors de la suppression de la dette.');
    } finally {
      setLoading(prev => ({ ...prev, debt: false }));
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = user.username.toLowerCase().includes(searchLower) ||
                         user.email.toLowerCase().includes(searchLower);
    
    if (activeFilter === 'hasDebt') return matchesSearch && (user.debt || 0) > 0;
    if (activeFilter === 'noDebt') return matchesSearch && (!user.debt || user.debt === 0);
    
    return matchesSearch;
  });

  if (loading.users && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <main className="container mx-auto px-4 py-6 max-w-md">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <main className="container mx-auto px-4 py-6 max-w-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md">
        {/* Liste des utilisateurs (si aucun utilisateur sélectionné) */}
        {!selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
              <button
                className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
                onClick={() => navigate('/parametres')}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
            </div>
            <div className="space-y-4">

              <div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ backgroundColor: 'white' }}
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  Tous les utilisateurs
                </button>
                <button
                  onClick={() => setActiveFilter('hasDebt')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeFilter === 'hasDebt' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  Avec dette
                </button>
              </div>
              <div className="space-y-3">
                {loading.users ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Aucun utilisateur trouvé</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="card hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <div className="flex items-center space-x-2">
                            {user.debtHistory && user.debtHistory.filter((debt: UserDebt) => debt.status === 'unpaid').reduce((sum: number, debt: UserDebt) => sum + (debt.amount || 0), 0) > 0 ? (
                              <span className="text-sm font-medium text-red-600">Dette: {user.debtHistory.filter((debt: UserDebt) => debt.status === 'unpaid').reduce((sum: number, debt: UserDebt) => sum + (debt.amount || 0), 0).toFixed(2)} €</span>
                            ) : (
                              <span className="text-sm text-green-600">Compte à jour</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.role === 'admin' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        )}
                        <span className="text-gray-400">→</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {/* Détail utilisateur (si un utilisateur est sélectionné) */}
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Gestion de {selectedUser.username}</h1>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Retour</span>
              </button>
            </div>
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">{selectedUser.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedUser.username}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedUser.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {selectedUser.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total des dettes à régler :</p>
                  <p className="text-xl font-bold text-red-600">
                    {debtSummary ? debtSummary.totalUnpaid.toFixed(2) : '0.00'} €
                  </p>
                </div>
                
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-3">Gestion des droits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.role === 'user' ? (
                      <button 
                        onClick={() => updateUserRole(selectedUser.id, 'admin')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Promouvoir administrateur
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateUserRole(selectedUser.id, 'user')}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors flex items-center gap-1 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Révoquer droits admin
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      Supprimer le compte
                    </button>
                  </div>
                </div>
                
                {/* Formulaire d'ajout de dette manuelle */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3">Ajouter une dette manuelle</h4>
                  <div className="bg-white shadow rounded-lg p-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="debtAmount" className="block text-sm font-medium text-gray-700 mb-1">
                          Montant (€)
                        </label>
                        <input
                          type="number"
                          id="debtAmount"
                          min="0.01"
                          step="0.01"
                          value={newDebt.amount}
                          onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '0.00') {
                              setNewDebt({ ...newDebt, amount: '' });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0.00"
                          disabled={addingDebt}
                        />
                      </div>
                      <div>
                        <label htmlFor="debtDescription" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          id="debtDescription"
                          value={newDebt.description}
                          onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Description de la dette"
                          disabled={addingDebt}
                        />
                      </div>
                      <button
                        onClick={handleAddDebt}
                        disabled={addingDebt || !newDebt.amount || parseFloat(newDebt.amount) <= 0 || !newDebt.description.trim()}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium ${addingDebt || !newDebt.amount || parseFloat(newDebt.amount) <= 0 || !newDebt.description.trim() ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} transition-colors`}
                      >
                        {addingDebt ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="animate-spin h-5 w-5 mr-2" />
                            Ajout en cours...
                          </span>
                        ) : (
                          'Ajouter la dette'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Section d'historique des dettes manuelles */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3">Historique des dettes manuelles</h4>
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    {loading.userDetails ? (
                      <div className="p-4 flex justify-center">
                        <Loader2 className="animate-spin h-6 w-6 text-primary-500" />
                      </div>
                    ) : debtHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {debtHistory.map((debt) => (
                              <tr key={debt.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(debt.created_at || '')}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{debt.description}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">{(debt.amount || 0).toFixed(2)} €</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    debt.status === 'unpaid' ? 'bg-red-100 text-red-800' : 
                                    debt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {debt.status === 'unpaid' ? 'Non payée' : 
                                     debt.status === 'pending' ? 'En attente' : 
                                     'Payée'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {debt.status === 'unpaid' && debt.id && (
                                    <button
                                      onClick={() => handleDeleteDebt(debt.id!)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Supprimer la dette"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Aucune dette manuelle pour cet utilisateur
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Users;