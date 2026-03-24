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
  const [debtSummary, setDebtSummary] = useState<{ totalUnpaid: number } | null>(null);
  const [loading, setLoading] = useState({
    users: true,
    userDetails: false
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'hasDebt' | 'noDebt'>('all');
  const [newDebt, setNewDebt] = useState<{ amount: string; description: string }>({ amount: '', description: '' });
  const [addingDebt, setAddingDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<{ id: string; amount: string; description: string } | null>(null);
  const [blockAutoReload, setBlockAutoReload] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, UserDebt>>(new Map());
  const [roleUpdateLocks, setRoleUpdateLocks] = useState<Set<string>>(new Set());
  const [isPageActive, setIsPageActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Fonction pour calculer le résumé des dettes d'un utilisateur
  const calculateDebtSummary = (debts: UserDebt[]) => {
    const unpaidDebts = debts.filter(debt => debt.status === 'unpaid');
    const totalUnpaid = unpaidDebts.reduce((total, debt) => total + (debt.amount || 0), 0);
    return { totalUnpaid };
  };

  const fetchUsers = useCallback(async (excludeUserId?: string) => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      setError(null);
      
      // Vider la liste actuelle pour éviter les problèmes de mise à jour
      setUsers([]);
      
      const users = await userService.getAllUsers();
      
      if (users.length === 0) {
        setError('Aucun utilisateur trouvé. Veuillez réessayer ou contacter le support.');
        return;
      }
      
      // Si un ID d'utilisateur est fourni à exclure (cas de suppression), on le filtre immédiatement
      const filteredUsers = excludeUserId 
        ? users.filter(user => user.id !== excludeUserId)
        : users;
      
      // Tri alphabétique par nom d'utilisateur
      const sortedUsers = [...filteredUsers].sort((a, b) => {
        const nameA = (a.username || a.email || '').toLowerCase();
        const nameB = (b.username || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Optimisation : traitement par lots pour éviter de surcharger l'API
      const batchSize = 10;
      const userBatches = [];
      
      for (let i = 0; i < sortedUsers.length; i += batchSize) {
        userBatches.push(sortedUsers.slice(i, i + batchSize));
      }
      
      // Utiliser un tableau temporaire pour collecter tous les utilisateurs traités
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
      }
      
      // Mettre à jour l'état une seule fois avec tous les utilisateurs traités
      setUsers(processedUsers);
      
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
        
        // Récupérer le résumé des dettes avec debtService pour avoir la même valeur que dans la page de
        // dettes (utilisation de la même source de données)
        const summary = await debtService.getDebtSummary(userId);
        setDebtSummary(summary);
        
        // Récupérer l'historique des dettes avec fusion des optimistic updates
        const backendDebts = await userService.getUserDebtHistory(userId);
        
        // Ne garder que les dettes manuelles encore ouvertes.
        // Avec le schéma actuel de debts, on ne peut plus distinguer via created_by.
        // On considère ici qu'une dette manuelle est une dette sans order_id.
        const filteredDebts = backendDebts.filter(
          debt => debt.status === 'unpaid' && !debt.order_id
        );
        
        const mergedDebts = mergeDebtData(filteredDebts);
        setDebtHistory(mergedDebts);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des détails de l\'utilisateur:', err);
      setError('Erreur lors du chargement des détails de l\'utilisateur');
    } finally {
      setLoading(prev => ({ ...prev, userDetails: false }));
    }
  }, [mergeDebtData]);

  // Fonction centrale pour synchroniser toutes les données
  // CORRECTION: Retrait de la dépendance à fetchUsers et fetchUserDetails pour éviter les boucles infinies
  const syncAllData = useCallback(
    async (force = false) => {
      console.log('🔄 [syncAllData] Synchronisation des données utilisateurs');
      
      // Vérifier si la page est active ou si on force la synchronisation
      if (!document.hidden || force) {
        try {
          // CORRECTION: Utiliser directement les appels API sans passer par les fonctions callback
          // pour éviter les dépendances circulaires
          
          // Récupérer la liste des utilisateurs
          console.log('🔍 [syncAllData] Récupération de la liste des utilisateurs');
          const usersResponse = await supabase
            .from('profiles')
            .select('*')
            .order('username');
          
          if (usersResponse.error) throw usersResponse.error;
          setUsers(usersResponse.data || []);
          
          // Si un utilisateur est sélectionné, mettre à jour ses détails
          const userIdFromUrl = searchParams.get('userId');
          if (userIdFromUrl) {
            console.log('🔍 [syncAllData] Récupération des détails de l\'utilisateur:', userIdFromUrl);
            
            // Récupérer les détails de l'utilisateur
            const userResponse = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userIdFromUrl)
              .single();
            
            if (userResponse.error) throw userResponse.error;
            
            // Récupérer l'historique des dettes
            const debtHistoryResponse = await supabase
              .from('debts')
              .select('*')
              .eq('user_id', userIdFromUrl)
              .order('created_at', { ascending: false });
            
            if (debtHistoryResponse.error) throw debtHistoryResponse.error;
            
            // Calculer le résumé des dettes
            const debtHistory = debtHistoryResponse.data || [];
            const debtSummary = calculateDebtSummary(debtHistory);
            
            // Mettre à jour l'utilisateur sélectionné avec toutes ses données
            setSelectedUser({
              ...userResponse.data,
              debtHistory,
              debtSummary
            });
          }
          
          // Mettre à jour la dernière synchronisation
          setLastSyncTime(Date.now());
          console.log('✅ [syncAllData] Synchronisation réussie');
        } catch (error) {
          console.error('❌ [syncAllData] Erreur lors de la synchronisation:', error);
        }
      } else {
        console.log('💤 [syncAllData] Page inactive, synchronisation ignorée');
      }
    },
    [searchParams] // CORRECTION: Retrait des dépendances problématiques
  );

  // Abonnement temps réel aux changements de profils utilisateurs
  const subscribeToProfileUpdates = useCallback(() => {
    console.log('📡 [subscribeToProfileUpdates] Démarrage abonnement profils');
    
    const subscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload: any) => {
          console.log('🔔 [subscribeToProfileUpdates] Changement profil détecté:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedProfile = payload.new as any;
            
            // Mettre à jour la liste des utilisateurs
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.id === updatedProfile.id 
                  ? { ...user, role: updatedProfile.role, username: updatedProfile.username }
                  : user
              )
            );
            
            // Mettre à jour l'utilisateur sélectionné si c'est le même
            if (selectedUser && selectedUser.id === updatedProfile.id) {
              setSelectedUser(prev => prev ? {
                ...prev,
                role: updatedProfile.role,
                username: updatedProfile.username
              } : null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [subscribeToProfileUpdates] Déconnexion abonnement profils');
      subscription.unsubscribe();
    };
  }, [selectedUser]);

  // Abonnement temps réel aux changements de dettes
  const subscribeToDebtUpdates = useCallback(() => {
    console.log('📡 [subscribeToDebtUpdates] Démarrage abonnement dettes');
    
    const subscription = supabase
      .channel('debts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts'
        },
        (payload: any) => {
          console.log('🔔 [subscribeToDebtUpdates] Changement dette détecté:', payload);
          
          // CORRECTION: Éviter la dépendance circulaire avec syncAllData
          // Utiliser directement fetchUsers et fetchUserDetails si nécessaire
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            console.log('💾 [subscribeToDebtUpdates] Mise à jour des données suite à une modification de dette');
            
            // Mettre à jour la liste des utilisateurs
            fetchUsers();
            
            // Si un utilisateur est sélectionné, mettre à jour ses détails
            if (selectedUser) {
              fetchUserDetails(selectedUser.id);
            }
            
            // Mettre à jour le timestamp de dernière synchronisation
            setLastSyncTime(Date.now());
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [subscribeToDebtUpdates] Déconnexion abonnement dettes');
      subscription.unsubscribe();
    };
  }, [fetchUsers, fetchUserDetails, selectedUser]);

  // Gestionnaire de visibilité de la page
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setIsPageActive(isVisible);
    
    if (isVisible) {
      console.log('👁️ [handleVisibilityChange] Page redevenue visible - synchronisation');
      // Synchroniser si la page a été inactive plus de 30 secondes
      if (Date.now() - lastSyncTime > 30000) {
        // CORRECTION: Éviter la dépendance circulaire avec syncAllData
        console.log('💾 [handleVisibilityChange] Mise à jour des données après retour sur la page');
        
        // Mettre à jour la liste des utilisateurs
        fetchUsers();
        
        // Si un utilisateur est sélectionné, mettre à jour ses détails
        if (selectedUser) {
          fetchUserDetails(selectedUser.id);
        }
        
        // Mettre à jour le timestamp de dernière synchronisation
        setLastSyncTime(Date.now());
      }
    } else {
      console.log('👁️ [handleVisibilityChange] Page masquée');
    }
  }, [lastSyncTime, fetchUsers, fetchUserDetails, selectedUser]);

  // Gestionnaire d'événements personnalisés (changements de rôle admin)
  const handleAdminRoleChanged = useCallback((event: CustomEvent) => {
    console.log('🎭 [handleAdminRoleChanged] Changement de rôle admin détecté:', event.detail);
    
    // CORRECTION: Éviter la dépendance circulaire avec syncAllData
    console.log('💾 [handleAdminRoleChanged] Mise à jour des données après changement de rôle admin');
    
    // Utiliser un court délai pour laisser le temps aux mises à jour de se propager
    setTimeout(() => {
      // Mettre à jour la liste des utilisateurs
      fetchUsers();
      
      // Si un utilisateur est sélectionné, mettre à jour ses détails
      if (selectedUser) {
        fetchUserDetails(selectedUser.id);
      }
      
      // Mettre à jour le timestamp de dernière synchronisation
      setLastSyncTime(Date.now());
    }, 200);
  }, [fetchUsers, fetchUserDetails, selectedUser]);

  // useEffect principal - Initialisation et abonnements
  useEffect(() => {
    console.log('🚀 [useEffect] Initialisation de la page Users');
    
    // Chargement initial des données
    const initializeData = async () => {
      try {
        // Récupérer l'utilisateur sélectionné UNIQUEMENT depuis l'URL (plus depuis localStorage)
        const userIdFromUrl = searchParams.get('userId');
        const targetUserId = userIdFromUrl;
        
        // Si on arrive sur la page sans userId dans l'URL, supprimer l'ancien selectedUserId du localStorage
        if (!userIdFromUrl && localStorage.getItem('selectedUserId')) {
          localStorage.removeItem('selectedUserId');
        }
        
        console.log('🔍 [initializeData] Récupération initiale des données');
        
        // Récupérer la liste des utilisateurs directement
        const usersResponse = await supabase
          .from('profiles')
          .select('*')
          .order('username');
        
        if (usersResponse.error) throw usersResponse.error;
        setUsers(usersResponse.data || []);
        
        // Si un utilisateur est sélectionné, récupérer ses détails
        if (targetUserId) {
          console.log('🔍 [initializeData] Récupération des détails de l\'utilisateur:', targetUserId);
          
          // Récupérer les détails de l'utilisateur
          const userResponse = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();
          
          if (userResponse.error) throw userResponse.error;
          
          // Récupérer l'historique des dettes
          const debtHistoryResponse = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });
          
          if (debtHistoryResponse.error) throw debtHistoryResponse.error;
          
          // Calculer le résumé des dettes
          const debtHistory = debtHistoryResponse.data || [];
          const debtSummary = calculateDebtSummary(debtHistory);
          
          // Mettre à jour l'utilisateur sélectionné avec toutes ses données
          setSelectedUser({
            ...userResponse.data,
            debtHistory,
            debtSummary
          });
        }
        
        // Mettre à jour la dernière synchronisation
        setLastSyncTime(Date.now());
        console.log('✅ [initializeData] Initialisation réussie');
      } catch (error) {
        console.error('❌ [initializeData] Erreur lors de l\'initialisation:', error);
      }
    };
    
    // Exécuter l'initialisation des données
    initializeData();
    
    // Configurer les abonnements temps réel
    const unsubscribeProfiles = subscribeToProfileUpdates();
    const unsubscribeDebts = subscribeToDebtUpdates();
    
    // Configurer les gestionnaires d'événements
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('adminRoleChanged', handleAdminRoleChanged as EventListener);
    
    // Synchronisation périodique (toutes les 2 minutes si la page est active)
    const syncInterval = setInterval(() => {
      if (!document.hidden && Date.now() - lastSyncTime > 120000) {
        console.log('⏰ [Interval] Synchronisation périodique');
        syncAllData(true);
      }
    }, 60000); // Vérifier toutes les minutes
    
    // Nettoyage
    return () => {
      console.log('🧹 [useEffect] Nettoyage des abonnements');
      unsubscribeProfiles();
      unsubscribeDebts();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('adminRoleChanged', handleAdminRoleChanged as EventListener);
      clearInterval(syncInterval);
    };
  }, []); // CORRECTION: Aucune dépendance pour éviter les boucles infinies
  
  const isFirstNavigationRef = React.useRef(true);
  
  // useEffect pour la synchronisation lors des changements de navigation
  useEffect(() => {
    console.log('🧭 [useEffect] Changement de navigation détecté');
    
    // Synchroniser les données lors du retour sur la page
    if (location.pathname === '/admin/users' && isFirstNavigationRef.current) {
      console.log('🔄 [useEffect] Premier rendu de la page - synchronisation initiale');
      
      // CORRECTION: Éviter la dépendance circulaire avec syncAllData
      // Utiliser directement fetchUsers et fetchUserDetails
      fetchUsers();
      
      // Si un utilisateur est sélectionné, mettre à jour ses détails
      const userIdFromUrl = searchParams.get('userId');
      if (userIdFromUrl) {
        fetchUserDetails(userIdFromUrl);
      }
      
      // Marquer comme déjà exécuté
      isFirstNavigationRef.current = false;
    }
  }, [location.pathname, fetchUsers, fetchUserDetails, searchParams]);
  
  // useEffect pour la gestion de l'utilisateur sélectionné via URL
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    
    if (userIdFromUrl && (!selectedUser || selectedUser.id !== userIdFromUrl)) {
      console.log('🎯 [useEffect] Changement utilisateur sélectionné via URL:', userIdFromUrl);
      
      const loadUserFromUrl = async () => {
        const userData = await userService.getUserById(userIdFromUrl);
        if (userData) {
          setSelectedUser(userData);
          await fetchUserDetails(userIdFromUrl);
        }
      };
      
      loadUserFromUrl();
    }
  }, [searchParams, selectedUser, fetchUserDetails]);
  
  // Suppression de l'abonnement redondant qui cause une boucle infinie
  // Cet abonnement est déjà géré par subscribeToUserDebtUpdates plus bas
  // useEffect(() => {
  //   if (!selectedUser) return;
  //   
  //   const unsubscribeDebts = userService.subscribeToUserDebts(selectedUser.id, (payload) => {
  //     console.log('Mise à jour des dettes:', payload);
  //     if (selectedUser) {
  //       fetchUserDetails(selectedUser.id);
  //     }
  //   });
  //   
  //   return unsubscribeDebts;
  // }, [selectedUser, fetchUserDetails]);

  const subscribeToUserDebtUpdates = useCallback((userId: string) => {
    console.log(`🔔 Abonnement aux mises à jour des dettes pour l'utilisateur ${userId}`);
    
    // Utiliser un debounce pour éviter les rechargements trop fréquents
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const unsubscribe = userService.subscribeToUserDebts(userId, (payload) => {
      console.log('📡 Mise à jour de dette reçue dans Users.tsx:', payload);
      
      // Vérifier si les rechargements sont bloqués
      if (blockAutoReload) {
        console.log('🚫 [subscribeToUserDebtUpdates] Rechargement bloqué pendant l\'ajout de dette');
        return;
      }
      
      // Annuler tout timer existant
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Utiliser un délai pour éviter les rechargements multiples rapprochés
      debounceTimer = setTimeout(() => {
        console.log('⏱️ [subscribeToUserDebtUpdates] Rechargement après debounce');
        fetchUserDetails(userId);
      }, 300);
    });
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      unsubscribe();
    };
  }, [fetchUserDetails, blockAutoReload]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.id);
      
      // S'abonner aux mises à jour des dettes de l'utilisateur sélectionné
      const unsubscribe = subscribeToUserDebtUpdates(selectedUser.id);
      
      return unsubscribe;
    }
  }, [selectedUser?.id, fetchUserDetails, subscribeToUserDebtUpdates]);

  const handleSelectUser = (user: UserProfile) => {
    // Vérifier si l'utilisateur est déjà sélectionné pour éviter les rechargements inutiles
    if (selectedUser && selectedUser.id === user.id) {
      console.log('📋 [handleSelectUser] Utilisateur déjà sélectionné, pas de rechargement');
      return;
    }
    
    console.log('👤 [handleSelectUser] Sélection de l\'utilisateur:', user.username || user.email);
    
    // Sauvegarder l'ID de l'utilisateur sélectionné dans localStorage
    localStorage.setItem('selectedUserId', user.id);
    
    // Mettre à jour l'URL avec l'ID de l'utilisateur sélectionné
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('userId', user.id);
    setSearchParams(newSearchParams);
    
    // Mettre à jour l'utilisateur sélectionné dans l'état local
    setSelectedUser(user);
    
    // Charger les détails de l'utilisateur
    fetchUserDetails(user.id);
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
  // SYSTÈME DE VERROUILLAGE - Éviter les mises à jour concurrentes
  if (roleUpdateLocks.has(userId)) {
    return; // Opération déjà en cours pour cet utilisateur
  }

  try {
    // 1. VERROUILLER L'UTILISATEUR
    setRoleUpdateLocks(prev => new Set([...prev, userId]));
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      throw new Error('Utilisateur non trouvé');
    }

    // 2. OPTIMISTIC UPDATE INSTANTANÉ ET STABLE
    const optimisticUpdate = () => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    };
    
    // Appliquer l'optimistic update immédiatement
    optimisticUpdate();
    
    // Toast de confirmation immédiat
    toast.success(
      `${targetUser.username} ${newRole === 'admin' ? 'promu administrateur' : 'rétrogradé utilisateur'} !`,
      { duration: 3000 }
    );
    
    // 3. MISE À JOUR BACKEND - Sans attendre pour l'UI
    const success = await userService.updateUserRole(userId, newRole);
    
    if (success) {
      // 4. SYNCHRONISATION CONTEXTE AUTH - Seulement si nécessaire
      if (currentUser && userId === currentUser.id) {
        // Délai minimal pour éviter les conflits
        setTimeout(async () => {
          try {
            await refreshUserRole();
            
            // Toast spécial pour l'utilisateur concerné
            if (newRole === 'admin') {
              toast.success(
                '🎉 Vous avez maintenant accès aux fonctions administrateur !',
                { duration: 5000 }
              );
            } else {
              toast.success(
                '📝 Votre statut a été mis à jour. Les menus admin ne sont plus accessibles.',
                { duration: 4000 }
              );
            }
          } catch (authError) {
            console.error('⚠️ Erreur lors du rafraîchissement du contexte auth:', authError);
          }
        }, 100);
      }
      
      // 5. NOTIFICATION GLOBALE - Après un délai pour éviter les conflits
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('adminRoleChanged', {
          detail: { userId, newRole, isCurrentUser: currentUser?.id === userId }
        }));
      }, 150);
      
    } else {
      // ROLLBACK en cas d'erreur backend
      const originalRole = targetUser.role;
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: originalRole }
            : user
        )
      );
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          role: originalRole
        } : null);
      }
      
      toast.error('Erreur lors de la mise à jour du rôle. Veuillez réessayer.');
    }
    
  } catch (err) {
    console.error('❌ [updateUserRole] Erreur inattendue:', err);
    
    // Rollback en cas d'erreur
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      const originalRole = newRole === 'admin' ? 'user' : 'admin';
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: originalRole }
            : user
        )
      );
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: originalRole } : null);
      }
    }
    
    toast.error('Erreur lors de la mise à jour du rôle. Veuillez réessayer.');
  } finally {
    // 6. DÉVERROUILLER L'UTILISATEUR - Toujours après un délai
    setTimeout(() => {
      setRoleUpdateLocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, 500);
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
      
      // Le nouveau système de synchronisation temps réel gère automatiquement les suppressions
      
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
      // Le nouveau système de synchronisation temps réel se réactive automatiquement
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
        updated_at: new Date().toISOString(),
        order_id: null
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
  const handleBackToUserList = () => {
    try {
      // Supprimer l'utilisateur sélectionné du localStorage
      localStorage.removeItem('selectedUserId');
      
      // Supprimer les paramètres d'URL
      setSearchParams({});
      
      // Revenir immédiatement à la liste des utilisateurs
      setSelectedUser(null);
      
      // Déclencher un rechargement asynchrone des utilisateurs en arrière-plan
      // sans bloquer l'interface utilisateur
      setTimeout(() => {
        fetchUsers().catch(err => {
          console.error('Erreur lors du rechargement en arrière-plan:', err);
        });
      }, 100);
      
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
      console.log('🔥 [handleDeleteDebt] Début de suppression de la dette ID:', debtId);
      
      // Trouver la dette à supprimer pour avoir ses informations complètes
      const debtToRemove = debtHistory.find(debt => debt.id === debtId);
      if (!debtToRemove) {
        console.error('❌ [handleDeleteDebt] Dette non trouvée dans l\'historique local:', debtId);
        alert('Dette introuvable dans l\'historique local.');
        return;
      }
      
      console.log('🔎 [handleDeleteDebt] Dette à supprimer:', debtToRemove);
      
      // Optimistic update - Mettre à jour l'UI immédiatement
      // Sauvegarder l'état actuel des dettes pour pouvoir revenir en arrière en cas d'erreur
      const previousDebtHistory = [...debtHistory];
      
      // Filtrer la dette à supprimer de l'état local
      setDebtHistory(debtHistory.filter(debt => debt.id !== debtId));
      
      // Mettre à jour également le résumé des dettes si nécessaire
      if (debtSummary && debtToRemove.status === 'unpaid') {
        const newTotalUnpaid = Math.max(0, debtSummary.totalUnpaid - (debtToRemove.amount || 0));
        console.log('💰 [handleDeleteDebt] Mise à jour du total impayé:', debtSummary.totalUnpaid, '->', newTotalUnpaid);
        
        setDebtSummary({
          ...debtSummary,
          totalUnpaid: newTotalUnpaid
        });
      }
      
      // Appeler le service pour supprimer la dette
      console.log('💥 [handleDeleteDebt] Appel du service de suppression...');
      const result = await debtService.deleteDebt(debtId);
      
      if (result === true) {
        console.log('✅ [handleDeleteDebt] Suppression réussie!');
        toast.success('Dette supprimée avec succès');
        
        // Mettre à jour la dette totale de l'utilisateur si c'était une dette impayée
        if (debtToRemove.status === 'unpaid' && selectedUser) {
          const newDebtAmount = Math.max(0, (selectedUser.debt || 0) - (debtToRemove.amount || 0));
          console.log('💰 [handleDeleteDebt] Mise à jour de la dette utilisateur:', selectedUser.debt, '->', newDebtAmount);
          
          // Mettre à jour l'utilisateur sélectionné
          setSelectedUser(prev => prev ? {
            ...prev,
            debt: newDebtAmount
          } : null);
          
          // Mettre à jour la liste des utilisateurs
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === selectedUser.id 
                ? { ...user, debt: newDebtAmount }
                : user
            )
          );
        }
        
        // Force refresh des détails utilisateur pour s'assurer que tout est synchronisé
        if (selectedUser) {
          setTimeout(() => {
            fetchUserDetails(selectedUser.id).catch(err => {
              console.error('❌ [handleDeleteDebt] Erreur lors du rafraîchissement:', err);
            });
          }, 500);
        }
      } else {
        // La suppression a échoué, restaurer l'état précédent
        console.error('❌ [handleDeleteDebt] Échec de la suppression!');
        setDebtHistory(previousDebtHistory);
        
        // Restaurer également le résumé des dettes
        if (selectedUser) {
          console.log('🔄 [handleDeleteDebt] Récupération du résumé des dettes...');
          const summary = await debtService.getDebtSummary(selectedUser.id);
          setDebtSummary(summary);
        }
        
        toast.error('Impossible de supprimer cette dette.');
      }
    } catch (err) {
      console.error('❌ [handleDeleteDebt] Exception lors de la suppression:', err);
      toast.error('Une erreur est survenue lors de la suppression de la dette.');
      
      // En cas d'erreur, rafraîchir les détails pour s'assurer que les données sont cohérentes
      if (selectedUser) {
        console.log('🔄 [handleDeleteDebt] Rafraîchissement forcé après erreur...');
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

  if (loading.users && users.length === 0) {
    return (
      <div className="min-h-screen pb-16">
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
      <div className="min-h-screen pb-16">
        <main className="container mx-auto px-4 py-6 max-w-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-20 relative bg-white" style={{ background: '#fff' }}>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Liste des utilisateurs (si aucun utilisateur sélectionné) */}
        {!selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold" style={{ color: '#10182a' }}>Gestion des pax</h1>
              <button
                type="button"
                onClick={() => navigate('/parametres')}
                className="flex items-center px-4 py-2 rounded-lg shadow-sm text-white font-semibold transition-colors"
                style={{ background: 'linear-gradient(to right, #10182a, #2a4365)' }}
              >
                <span className="mr-2">Retour</span>
                <ArrowLeft className="h-5 w-5" />
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
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-700 hover:bg-white'}`}
                >
                  Tous les utilisateurs
                </button>
                <button
                  onClick={() => setActiveFilter('hasDebt')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeFilter === 'hasDebt' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700 hover:bg-white'}`}
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
                      className="card hover:bg-white cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center">
                          <h3 className="font-medium">{user.username}</h3>
                          {(user.debt ?? 0) > 0 && (
                            <span className="text-sm font-medium text-red-600 ml-2 flex items-center">Dette: {(user.debt ?? 0).toFixed(2)} €</span>
                          )}
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
              <h1 className="text-2xl font-bold text-[#10182a]">Gestion de {selectedUser.username}</h1>
              <button
                onClick={handleBackToUserList}
                className="flex items-center space-x-2 px-4 py-2 rounded-md bg-gradient-to-r from-[#10182a] to-[#2a4365] text-white hover:opacity-90 transition-opacity"
              >
                <span>Retour</span>
                <ArrowLeft className="h-5 w-5 ml-1" />
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
                        className="px-3 py-1 bg-gradient-to-r from-[#10182a] to-[#2a4365] text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Promouvoir administrateur
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateUserRole(selectedUser.id, 'user')}
                        className="px-3 py-1 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Révoquer droits admin
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-1 text-sm"
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
                
                {/* Section d'historique des dettes en cours */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3">Dettes en cours</h4>
                  <div className="rounded-lg overflow-hidden">
                    {loading.userDetails ? (
                      <div className="p-4 flex justify-center">
                        <Loader2 className="animate-spin h-6 w-6 text-primary-500" />
                      </div>
                    ) : debtHistory.length > 0 ? (
                      <div className="grid gap-3 p-4 w-full">
                        {debtHistory.map((debt) => (
                          <div key={debt.id} className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between w-full shadow-sm">
                            {editingDebt && editingDebt.id === debt.id ? (
                              // Mode édition
                              <div className="w-full">
                                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                    <input
                                      type="text"
                                      value={editingDebt.description}
                                      onChange={(e) => setEditingDebt({ ...editingDebt, description: e.target.value })}
                                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  </div>
                                  <div className="sm:w-1/4">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Montant (€)</label>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={editingDebt.amount}
                                      onChange={(e) => setEditingDebt({ ...editingDebt, amount: e.target.value })}
                                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={handleCancelEditDebt}
                                    className="px-3 py-1 text-xs bg-white hover:bg-white rounded-md transition-colors"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={handleUpdateDebt}
                                    className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Mode affichage
                              <>
                                <div className="flex-1 mb-2 sm:mb-0">
                                  <div className="text-sm font-medium">{debt.description.includes('Commande #') ? 'Commande utilisateur' : debt.description}</div>
                                  <div className="text-xs text-gray-500 mt-1">{formatDate(debt.created_at || '')}</div>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    debt.status === 'unpaid' ? 'bg-red-100 text-red-800' : 
                                    debt.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {debt.status === 'unpaid' ? 'Non payée' : 
                                     debt.status === 'payment_pending' ? 'En attente' : 
                                     'Payée'}
                                  </span>
                                  
                                  <span className="font-medium text-red-600">{(debt.amount || 0).toFixed(2)} €</span>
                                  
                                  {/* Boutons d'action conditionnels - uniquement pour les dettes non réglées/validées */}
                                  {debt.status === 'unpaid' && debt.id && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleStartEditDebt(debt)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                        title="Modifier la dette"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDebt(debt.id!)}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                        title="Supprimer la dette"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Aucune dette en cours
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Users;