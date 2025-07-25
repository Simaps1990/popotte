import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserProfile } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { signIn, signUp, signOut as authSignOut, getCurrentUser, isAdmin } from '../lib/auth'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any } | null>
  signUp: (email: string, password: string, username: string, firstName?: string, lastName?: string) => Promise<{ error: any } | null>
  signOut: () => Promise<void>
  isAdmin: boolean
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ error: any } | null>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any } | null>
  refreshUserRole: () => Promise<boolean>
  setLoadingState: (isLoading: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const updateUserData = async (user: any) => {
    console.log('🔄 Mise à jour des données utilisateur pour:', user?.email || 'inconnu')
    
    if (!user) {
      console.log('❌ Aucun utilisateur fourni, réinitialisation de l\'état')
      setUser(null)
      setProfile(null)
      setIsUserAdmin(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Récupérer les données utilisateur en parallèle
      console.log('🔍 Récupération des données utilisateur...')
      const [userWithProfile, adminStatus] = await Promise.all([
        getCurrentUser(),
        isAdmin(user.id)
      ])
      
      // Mettre à jour l'état
      if (userWithProfile) {
        console.log('👤 Données du profil récupérées:', userWithProfile)
        setUser(userWithProfile)
        setProfile(userWithProfile.profile || null)
      } else {
        console.log('⚠️ Aucune donnée de profil trouvée')
      }
      
      console.log('🔑 Statut administrateur:', adminStatus ? 'OUI' : 'NON')
      setIsUserAdmin(adminStatus)
      
      console.log('✅ Données utilisateur mises à jour', { 
        userId: user.id,
        email: user.email,
        isAdmin: adminStatus,
        hasProfile: !!userWithProfile
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données utilisateur:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    
    console.log('🚀 INITIALISATION AUTHCONTEXT - LOGIQUE SIMPLIFIÉE')
    
    // PAS DE checkSession() initial - on fait confiance à onAuthStateChange
    // Juste initialiser en mode loading
    console.log('🔄 État initial: loading=true, attente des événements Supabase')

    // Timeout de sécurité pour éviter le loading infini
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.log('⏱️ Délai de chargement dépassé - Intervention forcée')
        console.log('🔄 Passage en mode non-connecté par défaut')
        setUser(null)
        setProfile(null)
        setIsUserAdmin(false)
        setLoading(false)
      }
    }, 2000) // 2 secondes maximum

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log(`🔔 Événement d'authentification détecté: ${event}`);
        
        if (!isMounted) {
          console.log('⚠️ Composant démonté, événement ignoré');
          return;
        }
        
        // Gérer les différents événements d'authentification
        switch (event) {
          case 'SIGNED_IN':
            console.log('🔓 Utilisateur connecté - MISE À JOUR IMMÉDIATE');
            clearTimeout(timeoutId); // Annuler le timeout
            if (session?.user) {
              console.log(`🔄 Mise à jour des données utilisateur pour: ${session.user.email}`);
              // MISE À JOUR IMMÉDIATE sans attendre updateUserData
              setUser(session.user);
              setLoading(false);
              console.log('✅ État utilisateur mis à jour immédiatement');
              // Puis mettre à jour le profil en arrière-plan
              updateUserData(session.user);
            } else {
              setLoading(false);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🔒 Utilisateur déconnecté');
            setUser(null);
            setProfile(null);
            setIsUserAdmin(false);
            setLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token rafraîchi');
            if (session?.user) {
              // Mise à jour légère pour éviter les boucles infinies
              setUser(session.user);
            }
            setLoading(false);
            break;
            
          case 'INITIAL_SESSION':
            console.log('🏁 Session initiale');
            if (session?.user) {
              await updateUserData(session.user);
            } else {
              setLoading(false);
            }
            break;
            
          case 'USER_UPDATED':
            console.log('🔄 Utilisateur mis à jour');
            if (session?.user) {
              // Mise à jour légère pour éviter les boucles infinies
              setUser(session.user);
              setLoading(false);
            }
            break;
            
          case 'PASSWORD_RECOVERY':
            console.log('🔑 Récupération de mot de passe');
            break;
            
          default:
            console.log(`ℹ️ Événement non géré spécifiquement: ${event}`);
            if (session?.user) {
              console.log('🔄 Mise à jour des données utilisateur par défaut');
              await updateUserData(session.user);
            } else {
              setUser(null);
              setProfile(null);
              setIsUserAdmin(false);
              setLoading(false);
            }
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const { user, error } = await signIn(email, password)
    if (user) {
      const userWithProfile = await getCurrentUser()
      if (userWithProfile) {
        setUser(userWithProfile)
        setProfile(userWithProfile.profile || null)
        const adminStatus = await isAdmin(userWithProfile.id)
        setIsUserAdmin(adminStatus)
      }
    }
    return { error }
  }

  const handleSignUp = async (email: string, password: string, username: string, firstName: string = '', lastName: string = '') => {
    console.log('🔐 Tentative d\'inscription avec:', { email, username, firstName, lastName })
    const { user, error } = await signUp({ 
      email, 
      password, 
      username,
      firstName, // Utiliser le prénom fourni
      lastName  // Utiliser le nom fourni
    })
    
    if (user) {
      const userWithProfile = await getCurrentUser()
      if (userWithProfile) {
        setUser(userWithProfile)
        setProfile(userWithProfile.profile || null)
        setIsUserAdmin(false) // Les nouveaux utilisateurs ne sont pas admin par défaut
      }
    }
    return { error }
  }

  const handleSignOut = async () => {
    try {
      console.log('🔒 Début de la déconnexion dans AuthContext...');
      
      // Déconnexion via la fonction auth
      const { error } = await authSignOut();
      
      if (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
      } else {
        console.log('✅ Déconnexion réussie');
      }
      
      // Réinitialiser l'état local immédiatement
      setUser(null);
      setProfile(null);
      setIsUserAdmin(false);
      
      // Forcer un rechargement de la page pour garantir un état propre
      // Cela garantit que toutes les données en mémoire sont effacées
      console.log('🔄 Rechargement de la page pour garantir un état propre...');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la déconnexion:', error);
    }
  }

  const handleUpdateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      if (!user) {
        return { error: new Error('Utilisateur non connecté') }
      }
      
      console.log('Mise à jour du profil pour l\'utilisateur:', user.id, 'avec les données:', profileData)
      
      // Extraire les données pour les métadonnées utilisateur
      const userMetadata = {
        username: profileData.username,
        full_name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
      }
      
      // 1. Mettre à jour les métadonnées utilisateur
      console.log('Mise à jour des métadonnées utilisateur...')
      const { error: metadataError } = await supabase.auth.updateUser({
        data: userMetadata
      })
      
      if (metadataError) {
        console.error('Erreur lors de la mise à jour des métadonnées:', metadataError)
        return { error: metadataError }
      }
      
      // 2. Mettre à jour secure_profiles (table principale)
      console.log('Tentative de mise à jour du profil dans secure_profiles...')
      let secureData = null;
      let secureError = null;
      
      try {
        const secureResult = await supabase
          .from('secure_profiles')
          .update({
            username: profileData.username,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();
          
        secureData = secureResult.data;
        secureError = secureResult.error;
        
        if (secureError) {
          console.warn('Erreur lors de la mise à jour du profil dans secure_profiles:', secureError);
        } else {
          console.log('Profil mis à jour avec succès dans secure_profiles:', secureData);
        }
      } catch (error) {
        console.warn('Exception lors de la mise à jour de secure_profiles:', error);
      }
      
      // Note: La table user_profiles n'est plus utilisée pour éviter les erreurs 406
      let userData = null;
      let userError = null;
      
      // 4. Mettre à jour profiles (table originale)
      console.log('Tentative de mise à jour du profil dans profiles...');
      let profilesData = null;
      let profilesError = null;
      
      try {
        const profilesResult = await supabase
          .from('profiles')
          .update({
            username: profileData.username,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();
          
        profilesData = profilesResult.data;
        profilesError = profilesResult.error;
        
        if (profilesError) {
          console.warn('Erreur lors de la mise à jour du profil dans profiles:', profilesError);
          
          // Essayer d'insérer si la mise à jour échoue (peut-être que le profil n'existe pas)
          try {
            const insertResult = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                username: profileData.username,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (insertResult.error) {
              console.warn('Erreur lors de l\'insertion du profil dans profiles:', insertResult.error);
            } else {
              console.log('Profil créé avec succès dans profiles:', insertResult.data);
              profilesData = insertResult.data;
              profilesError = null;
            }
          } catch (insertCatchError) {
            console.error('Exception lors de l\'insertion du profil:', insertCatchError);
          }
        } else {
          console.log('Profil mis à jour avec succès dans profiles:', profilesData);
        }
      } catch (error) {
        console.warn('Exception lors de la mise à jour de profiles:', error);
      }
      
      // 5. Forcer la mise à jour du profil dans l'état local
      // Utiliser les données de secure_profiles en priorité, puis profiles
      const updatedProfileData = secureData || profilesData || {
        ...profileData,
        user_id: user.id,
        id: user.id
      };
      
      console.log('Mise à jour du profil dans l\'état local avec:', updatedProfileData);
      
      // Mettre à jour uniquement le profil local sans déclencher de rechargement complet
      setProfile({
        ...updatedProfileData,
        // Assurer que ces champs sont toujours présents
        first_name: profileData.first_name || updatedProfileData.first_name || '',
        last_name: profileData.last_name || updatedProfileData.last_name || '',
        username: profileData.username || updatedProfileData.username || ''
      });
      
      // IMPORTANT: Ne pas appeler updateUserData(user) ici pour éviter la boucle infinie
      // Mettre à jour l'utilisateur localement si nécessaire
      if (user && user.user_metadata) {
        // Mettre à jour uniquement les métadonnées localement sans rechargement
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            username: profileData.username,
            full_name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
          }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { error };
    }
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user) {
        return { error: new Error('Utilisateur non connecté') }
      }
      
      // Vérifier d'abord le mot de passe actuel
      const { error: signInError } = await signIn(user.email || '', currentPassword)
      
      if (signInError) {
        return { error: new Error('Mot de passe actuel incorrect') }
      }
      
      // Changer le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        console.error('Erreur lors du changement de mot de passe:', error)
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)
      return { error }
    }
  }

  // Fonction pour rafraîchir le statut admin de l'utilisateur
  const refreshUserRole = async () => {
    try {
      if (!user) return false;
      
      console.log('🔄 Rafraîchissement du statut admin pour:', user.email);
      
      // Récupérer le profil utilisateur complet pour s'assurer d'avoir les données les plus récentes
      const userWithProfile = await getCurrentUser();
      
      // Vérifier le statut admin
      const adminStatus = await isAdmin(user.id);
      
      console.log('🔑 Nouveau statut administrateur:', adminStatus ? 'OUI' : 'NON');
      
      // Mettre à jour le profil et le statut admin en même temps pour garantir la cohérence
      if (userWithProfile) {
        console.log('👤 Mise à jour du profil utilisateur avec les nouvelles données');
        setUser(userWithProfile);
        setProfile(userWithProfile.profile || null);
      }
      
      // Mettre à jour le statut admin
      setIsUserAdmin(adminStatus);
      
      // Forcer un petit délai pour s'assurer que tous les composants ont le temps de se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return adminStatus;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du statut admin:', error);
      return false;
    }
  };

  // Fonction pour permettre aux composants externes de contrôler l'état de chargement
  // Utile pour résoudre le problème du spinner infini lors du retour sur l'application
  const setLoadingState = (isLoading: boolean) => {
    console.log(`🔄 État de chargement défini manuellement à: ${isLoading ? 'ACTIF' : 'INACTIF'}`);
    setLoading(isLoading);
  };

  const value = {
    user,
    profile,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    isAdmin: isUserAdmin,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
    refreshUserRole,
    setLoadingState
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}