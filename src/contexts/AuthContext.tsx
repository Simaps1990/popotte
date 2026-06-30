import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, UserProfile } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { signIn, signUp, signOut as authSignOut, getCurrentUser, isAdmin } from '../lib/auth'
import { logger } from '../lib/logger'

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
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Variables globales pour éviter les courses conditions et gérer les reconnexions
let isSessionAlreadyProcessed = false;
let lastSessionCheck = 0;
let sessionCheckInterval: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Augmenté pour plus de tolérance
const SESSION_CHECK_INTERVAL = 60000; // 60 secondes (moins fréquent pour éviter les déconnexions)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const updateUserData = async (user: any) => {
    if (!user) {
      setUser(null)
      setProfile(null)
      setIsUserAdmin(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Récupérer les données utilisateur en parallèle
      const [userWithProfile, adminStatus] = await Promise.all([
        getCurrentUser(),
        isAdmin()
      ])
      
      // Mettre à jour l'état
      let detectedAdmin = adminStatus;
      if (userWithProfile?.profile?.role === 'admin') {
        detectedAdmin = true;
      }
      if (userWithProfile) {
        setUser(userWithProfile)
        setProfile(userWithProfile.profile || null)
      }
      
      setIsUserAdmin(detectedAdmin)
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des données utilisateur:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Si l'utilisateur arrive via un lien Supabase de récupération de mot de passe,
    // on force l'affichage de la page /reset-password (tout en conservant le hash avec les tokens).
    // Netlify/SPA redirige vers index.html, mais React Router doit être sur la bonne route.
    const currentHash = window.location.hash || ''
    const currentSearch = window.location.search || ''
    const searchParams = new URLSearchParams(currentSearch)
    const isRecoveryLink =
      currentHash.includes('type=recovery') ||
      currentHash.includes('access_token=') ||
      searchParams.get('type') === 'recovery' ||
      !!searchParams.get('code')

    if (isRecoveryLink && window.location.pathname !== '/reset-password') {
      window.location.replace(`/reset-password${currentSearch}${currentHash}`)
      return () => {
        isMounted = false
      }
    }
    
    // Fonction améliorée pour vérifier la session existante
    const checkExistingSession = async () => {
      try {
        // Éviter les vérifications trop fréquentes
        const now = Date.now();
        if (now - lastSessionCheck < 10000) { // Pas plus d'une fois toutes les 10 secondes
          return;
        }
        lastSessionCheck = now;
        
        // Vérifier si l'utilisateur est déjà connecté et valide
        if (user && user.id && user.email) {
          // Si nous avons déjà un utilisateur valide, éviter les vérifications inutiles
          return;
        }
        
        logger.debug('🔍 Vérification de la session existante...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          logger.debug('✅ Session utilisateur valide trouvée');
          // Stocker la session dans localStorage pour récupération d'urgence
          try {
            localStorage.setItem('lastValidSession', JSON.stringify({
              timestamp: Date.now(),
              userId: session.user.id,
              email: session.user.email
            }));
          } catch (e) {
            logger.warn('Impossible de stocker les infos de session:', e);
          }
          
          setUser(session.user);
          setLoading(false);
          reconnectAttempts = 0; // Réinitialiser le compteur de tentatives
          // Ne pas appeler updateUserData ici pour éviter le double chargement
        }
      } catch (error) {
        logger.error('❌ Erreur lors de la vérification de la session existante:', error);
      }
    };
    
    // Fonction pour tenter de récupérer une session perdue
    const handleSessionRecovery = async () => {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error(`❌ Échec après ${MAX_RECONNECT_ATTEMPTS} tentatives de récupération de session`);
        // Ne pas déconnecter automatiquement, essayer une dernière approche
        try {
          logger.debug('🚨 Tentative de récupération d\'urgence avec getSession...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            logger.debug('✅ Session récupérée avec succès depuis getSession!');
            setUser(session.user);
            reconnectAttempts = 0;
            await updateUserData(session.user);
            return;
          }
        } catch (e) {
          logger.error('❌ Échec de la récupération d\'urgence:', e);
        }
        
        // Si tout échoue, ne pas forcer la déconnexion automatiquement
        // On laisse la session actuelle telle quelle et on arrête juste les tentatives
        setLoading(false);
        return;
      }
      
      reconnectAttempts++;
      logger.debug(`🔄 Tentative de récupération de session #${reconnectAttempts}...`);
      
      try {
        // Tenter de rafraîchir la session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          logger.error('❌ Échec du rafraîchissement de session:', error);
          // Attendre un peu avant la prochaine tentative
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Essayer getSession comme alternative
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              logger.debug('✅ Session récupérée via getSession après échec de refreshSession');
              setUser(session.user);
              reconnectAttempts = 0;
              await updateUserData(session.user);
              return;
            }
          } catch (e) {
            logger.error('❌ Échec de getSession après refreshSession:', e);
          }
          
          // Si l'erreur persiste, on continue les tentatives
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            // Ne pas déconnecter ici, on laissera la fonction principale le faire
          }
        } else if (data.session && data.user) {
          logger.debug('✅ Session récupérée avec succès via refreshSession');
          setUser(data.user);
          reconnectAttempts = 0; // Réinitialiser le compteur
          await updateUserData(data.user);
        }
      } catch (error) {
        logger.error('❌ Erreur lors de la tentative de récupération de session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Vérifier la session existante immédiatement
    checkExistingSession();
    
    // Système de récupération d'urgence basé sur localStorage
    if (!user) {
      try {
        const savedSession = localStorage.getItem('lastValidSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const sessionAge = Date.now() - sessionData.timestamp;
          
          // Si la session sauvegardée est récente (moins de 24h)
          if (sessionAge < 24 * 60 * 60 * 1000) {
            logger.debug('🚨 Tentative de récupération d\'urgence depuis localStorage...');
            // Forcer un rafraîchissement de session
            supabase.auth.refreshSession().then(({ data }: { data: { session: any; user: any } }) => {
              if (data.session && data.user) {
                logger.debug('✅ Session récupérée avec succès depuis localStorage!');
                setUser(data.user);
                updateUserData(data.user);
              }
            });
          }
        }
      } catch (e) {
        logger.warn('Erreur lors de la récupération d\'urgence:', e);
      }
    }
    
    // PAS DE checkSession() initial - on fait confiance à onAuthStateChange
    // Juste initialiser en mode loading

    // Timeout de sécurité pour éviter le loading infini
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        if (!loading) {
          return
        }
        // Ne pas forcer la déconnexion si loading déjà passé à false
        logger.warn('⚠️ Timeout de chargement atteint, arrêt du mode loading');
        setLoading(false)
      }
    }, 6000) // 6 secondes maximum (plus tolérant)
    
    // Mettre en place une vérification périodique de la session
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
    }
    
    // Vérification périodique moins fréquente pour éviter les déconnexions
    sessionCheckInterval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        // Vérifier uniquement si la page est visible pour éviter les déconnexions en arrière-plan
        checkExistingSession();
      }
    }, SESSION_CHECK_INTERVAL);

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!isMounted) {
          return;
        }
        
        // Gérer les différents événements d'authentification
        switch (event) {
          case 'SIGNED_IN':
            clearTimeout(timeoutId); // Annuler le timeout
            if (session?.user) {
              // Marquer la session comme traitée AVANT toute mise à jour du state React
              isSessionAlreadyProcessed = true;
              
              // Vérifier si l'utilisateur est déjà défini pour éviter les doubles chargements
              if (user?.id === session.user.id) {
                setLoading(false);
              } else {
                // Mise à jour immédiate de l'utilisateur sans attendre le profil
                setUser(session.user);
                setLoading(false);
                
                // Mettre à jour le profil en arrière-plan
                updateUserData(session.user);
              }
            } else {
              setLoading(false);
            }
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            setProfile(null);
            setIsUserAdmin(false);
            setLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              // Mise à jour légère pour éviter les boucles infinies
              setUser(session.user);
            }
            setLoading(false);
            break;
            
          case 'INITIAL_SESSION':
            logger.debug('🏁 Session initiale');
            // Éviter la double mise à jour si la session a déjà été traitée
            if (isSessionAlreadyProcessed) {
              setLoading(false);
              return;
            }
            if (session?.user) {
              // Marquer la session comme traitée
              isSessionAlreadyProcessed = true;
              
              // Vérifier si l'utilisateur est déjà défini pour éviter les doubles chargements
              if (user?.id === session.user.id) {
                setLoading(false);
              } else {
                setUser(session.user);
                setLoading(false);
                // Mettre à jour le profil en arrière-plan, mais avec un délai pour éviter les doubles chargements
                setTimeout(() => {
                  if (isMounted) {
                    updateUserData(session.user);
                  }
                }, 500);
              }
            } else {
              setLoading(false);
            }
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              // Mise à jour légère pour éviter les boucles infinies
              setUser(session.user);
              setLoading(false);
            }
            break;
            
          case 'PASSWORD_RECOVERY':
            // Forcer l'utilisateur sur la page de réinitialisation
            // (Supabase fournit les tokens dans le hash, qu'on conserve).
            if (window.location.pathname !== '/reset-password') {
              const hash = window.location.hash || ''
              const search = window.location.search || ''
              window.location.replace(`/reset-password${search}${hash}`)
              return
            }
            setLoading(false);
            break;
            
          default:
            if (session?.user) {
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
        const adminStatus = await isAdmin()
        setIsUserAdmin(adminStatus)
      }
    }
    return { error }
  }

  const handleSignUp = async (email: string, password: string, username: string, firstName: string = '', lastName: string = '') => {
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
      // Déconnexion via la fonction auth
      const { error } = await authSignOut();
      
      if (error) {
        logger.error('❌ Erreur lors de la déconnexion:', error);
      } else {
        logger.debug('✅ Déconnexion réussie');
      }
      
      // Réinitialiser l'état local immédiatement
      setUser(null);
      setProfile(null);
      setIsUserAdmin(false);
      
      // Forcer un rechargement de la page pour garantir un état propre
      // Cela garantit que toutes les données en mémoire sont effacées
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch (error) {
      logger.error('❌ Erreur inattendue lors de la déconnexion:', error);
    }
  }

  const handleUpdateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      if (!user) {
        return { error: new Error('Utilisateur non connecté') }
      }
      
      // Extraire les données pour les métadonnées utilisateur
      const userMetadata = {
        username: profileData.username,
        full_name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
      }
      
      // 1. Mettre à jour les métadonnées utilisateur
      const { error: metadataError } = await supabase.auth.updateUser({
        data: userMetadata
      })
      
      if (metadataError) {
        logger.error('Erreur lors de la mise à jour des métadonnées:', metadataError)
        return { error: metadataError }
      }
      
      // 2. Mettre à jour secure_profiles (table principale)
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
          logger.warn('Erreur lors de la mise à jour du profil dans secure_profiles:', secureError);
        }
      } catch (error) {
        logger.warn('Exception lors de la mise à jour de secure_profiles:', error);
      }
      
      // Note: La table user_profiles n'est plus utilisée pour éviter les erreurs 406
      let userData = null;
      let userError = null;
      
      // 4. Mettre à jour profiles (table originale)
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
          logger.warn('Erreur lors de la mise à jour du profil dans profiles:', profilesError);
          
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
              logger.warn('Erreur lors de l\'insertion du profil dans profiles:', insertResult.error);
            } else {
              profilesData = insertResult.data;
              profilesError = null;
            }
          } catch (insertCatchError) {
            logger.error('Exception lors de l\'insertion du profil:', insertCatchError);
          }
        }
      } catch (error) {
        logger.warn('Exception lors de la mise à jour de profiles:', error);
      }
      
      // 5. Forcer la mise à jour du profil dans l'état local
      // Utiliser les données de secure_profiles en priorité, puis profiles
      const updatedProfileData = secureData || profilesData || {
        ...profileData,
        user_id: user.id,
        id: user.id
      };
      
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
      logger.error('Erreur lors de la mise à jour du profil:', error);
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
        logger.error('Erreur lors du changement de mot de passe:', error)
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      logger.error('Erreur lors du changement de mot de passe:', error)
      return { error }
    }
  }

  // Fonction pour rafraîchir le statut admin de l'utilisateur
  const refreshUserRole = async () => {
    try {
      if (!user) return false;

      // Récupérer le profil utilisateur complet pour s'assurer d'avoir les données les plus récentes
      const userWithProfile = await getCurrentUser();
      // Vérifier le statut admin (app_metadata OU profile.role)
      let adminStatus = await isAdmin();
      if (userWithProfile?.profile?.role === 'admin') {
        adminStatus = true;

      }
      if (userWithProfile) {
        setUser(userWithProfile);
        setProfile(userWithProfile.profile || null);
      }
      setIsUserAdmin(adminStatus);
      // Forcer un petit délai pour s'assurer que tous les composants ont le temps de se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      return adminStatus;
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement du statut admin:', error);
      return false;
    }
  }

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
    setLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}