import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, Loader2, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userService, UserProfile, UserDebt, UserOrder } from '../../services/userService';
import { debtService } from '../../services/debtService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { DebtStatus } from '../../types/debt';

const Users: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editingDebt, setEditingDebt] = useState<{ id: string; amount: string; description: string } | null>(null);
  const [blockAutoReload, setBlockAutoReload] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, UserDebt>>(new Map());

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

  // Fonction de merge intelligent entre optimistic updates et données backend
  const mergeDebtData = useCallback((backendDebts: UserDebt[]): UserDebt[] => {
    const merged = [...backendDebts];
    
    // Ajouter les optimistic updates qui ne sont pas encore dans le backend
    optimisticUpdates.forEach((optimisticDebt) => {
      const existsInBackend = merged.some(debt => 
        debt.id === optimisticDebt.id || 
        (debt.amount === optimisticDebt.amount && 
         debt.description === optimisticDebt.description &&
         Math.abs(new Date(debt.created_at || '').getTime() - new Date(optimisticDebt.created_at || '').getTime()) < 5000)
      );
      
      if (!existsInBackend) {
        merged.unshift(optimisticDebt); // Ajouter en premier
      }
    });
    
    return merged.sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  }, [optimisticUpdates]);

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
        
        // Récupérer les dettes et les merger avec les optimistic updates
        const debts = await userService.getUserDebtHistory(userId, true);
        const mergedDebts = mergeDebtData(debts);
        setDebtHistory(mergedDebts);
        
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
      // Utiliser un flag pour éviter les appels redondants
      if (!loading.users) {
        fetchUsers();
      }
    });
    
    // Stocker la fonction de désabonnement dans la référence
    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [fetchUsers, loading.users]);
  
  // Fonction pour se désabonner temporairement
  const unsubscribeFromUserUpdates = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log('Désabonnement temporaire des mises à jour utilisateurs');
      const unsubscribe = unsubscribeRef.current;
      unsubscribeRef.current = null;
      unsubscribe();
    }
  }, []);
  
  // Effet pour le chargement initial des utilisateurs et l'abonnement
  useEffect(() => {
    // Chargement initial des utilisateurs
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
  }, []); // Aucune dépendance pour éviter les rechargements multiples
  
  // Effet séparé pour restaurer l'utilisateur sélectionné
  useEffect(() => {
    // Ne rien faire si les utilisateurs ne sont pas encore chargés
    if (users.length === 0 || loading.users) return;
    
    // Vérifier d'abord l'URL pour l'ID utilisateur
    const urlUserId = searchParams.get('userId');
    
    // Ensuite vérifier localStorage si rien dans l'URL
    const savedUserId = urlUserId || localStorage.getItem('selectedUserId');
    
    if (savedUserId) {
      console.log('Restauration de l\'utilisateur sélectionné:', savedUserId);
      const savedUser = users.find(u => u.id === savedUserId);
      if (savedUser) {
        console.log('Utilisateur trouvé, restauration de la sélection');
        setSelectedUser(savedUser);
        fetchUserDetails(savedUserId);
        
        // Mettre à jour l'URL si nécessaire
        if (!urlUserId) {
          setSearchParams({ userId: savedUserId });
        }
      }
    }
  }, [users, loading.users, fetchUserDetails, searchParams, setSearchParams]);

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
      
      // Vérifier si les rechargements sont bloqués
      if (blockAutoReload) {
        console.log('🚫 [subscribeToUserDebtUpdates] Rechargement bloqué pendant l\'ajout de dette');
        return;
      }
      
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
    // Sauvegarder l'ID de l'utilisateur sélectionné dans localStorage
    localStorage.setItem('selectedUserId', user.id);
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
    
    const amount = parseFloat(newDebt.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    
    if (!newDebt.description.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }

    try {
      setAddingDebt(true);
      
      console.log('🚀 [handleAddDebt] Ajout avec synchronisation intelligente instantanée');
      
      // ÉTAPE 1: Optimistic update instantané - aucun blocage, aucun délai
      const tempDebt: UserDebt = {
        id: `temp-${Date.now()}`,
        user_id: selectedUser.id,
        amount,
        description: newDebt.description,
        status: DebtStatus.UNPAID,
        created_at: new Date().toISOString(),
        created_by: selectedUser.id,
        order_id: undefined
      };
      
      // Ajouter à la map des optimistic updates pour le merge intelligent
      if (tempDebt.id) {
        setOptimisticUpdates(prev => new Map(prev).set(tempDebt.id!, tempDebt));
      }
      
      // Mise à jour instantanée de l'UI
      setDebtHistory(prev => [tempDebt, ...prev]);
      
      // Mise à jour des totaux
      if (debtSummary) {
        setDebtSummary(prev => prev ? {
          ...prev,
          totalUnpaid: prev.totalUnpaid + amount
        } : prev);
      }
      
      // Mise à jour de l'utilisateur sélectionné
      setSelectedUser(prev => prev ? {
        ...prev,
        debt: (prev.debt || 0) + amount
      } : prev);
      
      // Mise à jour de la liste des utilisateurs
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { ...user, debt: (user.debt || 0) + amount }
            : user
        )
      );
      
      console.log('✨ [handleAddDebt] Optimistic update appliqué instantanément');
      
      // Vider le formulaire
      setNewDebt({ amount: '', description: '' });
      
      // ÉTAPE 2: Création en arrière-plan (l'abonnement temps réel se chargera de la synchronisation)
      const result = await debtService.createDebt({
        userId: selectedUser.id,
        amount,
        description: newDebt.description,
        status: DebtStatus.UNPAID
      });
      
      if (result) {
        console.log('✅ [handleAddDebt] Dette créée en base avec succès');
        toast.success(`Dette ajoutée avec succès à ${selectedUser.username}`);
        
        // L'abonnement temps réel se chargera automatiquement de remplacer
        // l'optimistic update par la vraie dette via le merge intelligent
      } else {
        console.log('❌ [handleAddDebt] Échec création en base - Annulation optimistic update');
        
        // En cas d'échec, annuler l'optimistic update
        if (tempDebt.id) {
          setOptimisticUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(tempDebt.id!);
            return newMap;
          });
        }
        
        setDebtHistory(prev => prev.filter(debt => debt.id !== tempDebt.id));
        
        if (debtSummary) {
          setDebtSummary(prev => prev ? {
            ...prev,
            totalUnpaid: prev.totalUnpaid - amount
          } : prev);
        }
        
        setSelectedUser(prev => prev ? {
          ...prev,
          debt: Math.max(0, (prev.debt || 0) - amount)
        } : prev);
        
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === selectedUser.id 
              ? { ...user, debt: Math.max(0, (user.debt || 0) - amount) }
              : user
          )
        );
        
        toast.error('Erreur lors de l\'ajout de la dette');
      }
      
    } catch (err) {
      console.error('💥 [handleAddDebt] Erreur:', err);
      toast.error('Erreur lors de l\'ajout de la dette');
    } finally {
      setAddingDebt(false);
    }
  };

  const handleStartEditDebt = (debt: UserDebt) => {
    setEditingDebt({
      id: debt.id!,
      amount: debt.amount?.toString() || '',
      description: debt.description || ''
    });
  };

  const handleCancelEditDebt = () => {
    setEditingDebt(null);
  };

  // Fonction pour gérer le retour à la liste des utilisateurs
  const handleBackToUserList = async () => {
    try {
      // Supprimer l'utilisateur sélectionné du localStorage
      localStorage.removeItem('selectedUserId');
      
      // Supprimer les paramètres d'URL
      setSearchParams({});
      
      // Attendre un délai suffisant pour s'assurer que les changements sont propagés dans Supabase
      console.log('Attente de la propagation des changements...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recharger la liste des utilisateurs pour avoir les totaux à jour
      console.log('Rechargement de la liste des utilisateurs avant retour...');
      await fetchUsers();
      
      // Vérification : si l'utilisateur modifié n'a pas le bon total, réessayer
      if (selectedUser) {
        const updatedUser = users.find(u => u.id === selectedUser.id);
        if (updatedUser) {
          console.log(`Vérification du total pour ${updatedUser.username}: ${updatedUser.debt}€`);
          
          // Si le total semble incorrect, forcer un second rechargement
          if (updatedUser.debt === 0 || !updatedUser.debt) {
            console.log('Total semble incorrect, second rechargement...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchUsers();
          }
        }
      }
      
      // Revenir à la liste des utilisateurs
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur lors du retour à la liste:', error);
      // En cas d'erreur, revenir quand même à la liste
      setSelectedUser(null);
    }
  };

  const handleUpdateDebt = async () => {
    if (!editingDebt || !editingDebt.id) return;
    
    // Validation des données
    const amount = parseFloat(editingDebt.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Veuillez entrer un montant valide supérieur à 0');
      return;
    }
    
    if (!editingDebt.description.trim()) {
      alert('Veuillez entrer une description pour la dette');
      return;
    }
    
    try {
      // Optimistic update - Mettre à jour l'UI immédiatement
      const previousDebtHistory = [...debtHistory];
      const previousDebtSummary = debtSummary ? {...debtSummary} : null;
      
      // Trouver la dette à mettre à jour
      const debtToUpdate = debtHistory.find(debt => debt.id === editingDebt.id);
      if (!debtToUpdate) return;
      
      // Calculer la différence de montant pour mettre à jour le résumé
      const amountDifference = amount - (debtToUpdate.amount || 0);
      
      // Mettre à jour la dette dans l'état local
      const updatedDebtHistory = debtHistory.map(debt => {
        if (debt.id === editingDebt.id) {
          return {
            ...debt,
            amount: amount,
            description: editingDebt.description
          };
        }
        return debt;
      });
      
      setDebtHistory(updatedDebtHistory);
      
      // Mettre à jour le résumé des dettes si nécessaire
      if (debtSummary && debtToUpdate.status === 'unpaid') {
        setDebtSummary({
          ...debtSummary,
          totalUnpaid: debtSummary.totalUnpaid + amountDifference
        });
      }
      
      // Appeler le service pour mettre à jour la dette
      const result = await debtService.updateDebt(editingDebt.id, {
        amount: amount,
        description: editingDebt.description
      });
      
      if (result) {
        // Réinitialiser le mode édition
        setEditingDebt(null);
      } else {
        // La mise à jour a échoué, restaurer l'état précédent
        setDebtHistory(previousDebtHistory);
        if (previousDebtSummary) {
          setDebtSummary(previousDebtSummary);
        }
        
        alert('Impossible de mettre à jour cette dette.');
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la dette:', err);
      alert('Une erreur est survenue lors de la mise à jour de la dette.');
      
      // En cas d'erreur, rafraîchir les détails pour s'assurer que les données sont cohérentes
      if (selectedUser) {
        await fetchUserDetails(selectedUser.id);
      }
      
      // Réinitialiser le mode édition
      setEditingDebt(null);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dette ?')) {
      return;
    }
    
    try {
      // Optimistic update - Mettre à jour l'UI immédiatement
      // Sauvegarder l'état actuel des dettes pour pouvoir revenir en arrière en cas d'erreur
      const previousDebtHistory = [...debtHistory];
      
      // Filtrer la dette à supprimer de l'état local
      setDebtHistory(debtHistory.filter(debt => debt.id !== debtId));
      
      // Mettre à jour également le résumé des dettes si nécessaire
      if (debtSummary) {
        const debtToRemove = debtHistory.find(debt => debt.id === debtId);
        if (debtToRemove && debtToRemove.status === 'unpaid') {
          setDebtSummary({
            ...debtSummary,
            totalUnpaid: Math.max(0, debtSummary.totalUnpaid - (debtToRemove.amount || 0))
          });
        }
      }
      
      // Appeler le service pour supprimer la dette
      const result = await debtService.deleteDebt(debtId);
      
      if (result !== true) {
        // La suppression a échoué, restaurer l'état précédent
        setDebtHistory(previousDebtHistory);
        
        // Restaurer également le résumé des dettes
        if (selectedUser) {
          const summary = await debtService.getDebtSummary(selectedUser.id);
          setDebtSummary(summary);
        }
        
        alert('Impossible de supprimer cette dette. Elle est peut-être liée à une commande ou a déjà été supprimée.');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de la dette:', err);
      alert('Une erreur est survenue lors de la suppression de la dette.');
      
      // En cas d'erreur, rafraîchir les détails pour s'assurer que les données sont cohérentes
      if (selectedUser) {
        await fetchUserDetails(selectedUser.id);
      }
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

  // --- RENDU PRINCIPAL DE LA PAGE ADMIN USERS ---
  return (
    <div className="min-h-screen bg-white pb-16">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Titre principal */}
        <h1 className="text-2xl font-bold text-[#10182a] mb-6 text-center">Gestion des utilisateurs</h1>

        {/* Affichage erreur global */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10182a] bg-white"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search className="text-[#10182a]" size={20} />
          </div>
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-lg border ${activeFilter === 'all' ? 'bg-[#10182a] text-white' : 'bg-white text-[#10182a] border-[#10182a]'} font-medium`}
              onClick={() => setActiveFilter('all')}
            >Tous</button>
            <button
              className={`px-4 py-2 rounded-lg border ${activeFilter === 'hasDebt' ? 'bg-[#10182a] text-white' : 'bg-white text-[#10182a] border-[#10182a]'} font-medium`}
              onClick={() => setActiveFilter('hasDebt')}
            >Avec dettes</button>
            <button
              className={`px-4 py-2 rounded-lg border ${activeFilter === 'noDebt' ? 'bg-[#10182a] text-white' : 'bg-white text-[#10182a] border-[#10182a]'} font-medium`}
              onClick={() => setActiveFilter('noDebt')}
            >Sans dette</button>
          </div>
        </div>

        {/* Loader principal */}
        {loading.users && users.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
          </div>
        ) : null}

        {/* Liste des utilisateurs ou fiche utilisateur */}
        {!selectedUser ? (
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-12">Aucun utilisateur trouvé.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div>
                      <div className="font-semibold text-[#10182a]">{user.username || user.email}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">{user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-lg font-bold text-[#10182a]">{user.debt ? `${user.debt.toFixed(2)} €` : '0 €'}</div>
                      {user.debt && user.debt > 0 ? (
                        <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 mt-1">Dette en cours</span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 mt-1">Aucune dette</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // --- FICHE UTILISATEUR ---
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
            <button
              className="flex items-center space-x-2 text-[#10182a] hover:text-blue-700 transition-colors rounded px-3 py-1 mb-4 bg-white border border-[#10182a]"
              onClick={handleBackToUserList}
            >
              <ArrowLeft size={20} />
              <span>Retour à la liste</span>
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <div className="text-xl font-bold text-[#10182a]">{selectedUser?.username || selectedUser?.email}</div>
                <div className="text-sm text-gray-500">{selectedUser?.email}</div>
                <div className="text-xs text-gray-400">{selectedUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#10182a]">{debtSummary?.totalUnpaid?.toFixed(2) || '0.00'} €</div>
                <div className="text-xs text-gray-500">Total dettes en cours</div>
              </div>
            </div>

            {/* Section dettes et formulaire d'ajout */}
            <div className="space-y-6">
              {/* Formulaire d'ajout de dette */}
              <form
                className="flex flex-col md:flex-row md:items-end gap-4 bg-white p-4 rounded-lg border border-gray-100"
                onSubmit={e => { e.preventDefault(); handleAddDebt(); }}
              >
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#10182a] mb-1">Montant</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10182a] bg-white"
                    placeholder="Montant (€)"
                    value={newDebt.amount}
                    onChange={e => setNewDebt(d => ({ ...d, amount: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#10182a] mb-1">Description</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10182a] bg-white"
                    placeholder="Description de la dette"
                    value={newDebt.description}
                    onChange={e => setNewDebt(d => ({ ...d, description: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#10182a] text-white font-medium hover:bg-blue-900 transition-colors disabled:opacity-50"
                  disabled={addingDebt}
                >
                  {addingDebt ? <Loader2 className="animate-spin h-5 w-5" /> : 'Ajouter'}
                </button>
              </form>

              {/* Historique des dettes (cartes) */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#10182a] mb-2">Historique des dettes</h2>
                {debtHistory.length === 0 ? (
                  <div className="text-center text-gray-400">Aucune dette trouvée.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {debtHistory.map(debt => (
                      <div key={debt.id} className={`bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2 ${debt.status === 'paid' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-[#10182a]">{debt.amount.toFixed(2)} €</div>
                          <span className={`text-xs rounded-full px-2 py-0.5 ${debt.status === 'paid' ? 'bg-green-100 text-green-700' : debt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                            {debt.status === 'paid' ? 'Réglée' : debt.status === 'pending' ? 'En attente' : 'Non réglée'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{debt.description}</div>
                        <div className="text-xs text-gray-400">{formatDate(debt.created_at)}</div>
                        {/* Boutons édition/suppression si non réglée/non notifiée */}
                        {debt.status === 'unpaid' && (
                          <div className="flex space-x-2 mt-2">
                            <button
                              className="flex items-center px-3 py-1 rounded bg-[#10182a] text-white text-xs font-medium hover:bg-blue-900 transition-colors"
                              onClick={() => handleStartEditDebt(debt)}
                            >
                              <Edit size={16} className="mr-1" /> Éditer
                            </button>
                            <button
                              className="flex items-center px-3 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              onClick={() => handleDeleteDebt(debt.id!)}
                            >
                              <Trash2 size={16} className="mr-1" /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Édition de dette (modal simple) */}
            {editingDebt && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-[#10182a] mb-4">Éditer la dette</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#10182a] mb-1">Montant</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10182a] bg-white"
                      value={editingDebt.amount}
                      onChange={e => setEditingDebt(d => d ? { ...d, amount: e.target.value } : d)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#10182a] mb-1">Description</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10182a] bg-white"
                      value={editingDebt.description}
                      onChange={e => setEditingDebt(d => d ? { ...d, description: e.target.value } : d)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      className="px-4 py-2 rounded-lg bg-gray-200 text-[#10182a] font-medium hover:bg-gray-300 transition-colors"
                      onClick={handleCancelEditDebt}
                    >Annuler</button>
                    <button
                      className="px-4 py-2 rounded-lg bg-[#10182a] text-white font-medium hover:bg-blue-900 transition-colors"
                      onClick={handleUpdateDebt}
                    >Enregistrer</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Users;