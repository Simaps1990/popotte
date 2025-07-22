import { supabase } from './supabase'

export interface SignUpParams {
  email: string
  password: string
  username: string
  firstName?: string
  lastName?: string
}

export const signUp = async ({ email, password, username, firstName = '', lastName = '' }: SignUpParams) => {
  console.log('🚀 Début de la fonction signUp avec:', { email, username, firstName, lastName })
  
  try {
    // Vérifier que l'email est valide
    if (!email || !email.includes('@') || email.endsWith('@example.com')) {
      throw new Error('Veuillez utiliser une adresse email valide')
    }
    
    // Vérifier que le nom d'utilisateur est valide
    if (!username || username.trim().length < 3) {
      throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
    }
    
    // Vérifier qu'il n'y a pas d'espaces ou de caractères spéciaux dans le nom d'utilisateur
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Le nom d\'utilisateur ne doit contenir que des lettres, chiffres et underscores')
    }
    
    // Créer le compte utilisateur avec Supabase Auth
    console.log('🔑 Tentative de création du compte avec Supabase...')
    
    // Vérifier si un utilisateur avec ce nom d'utilisateur existe déjà
    const { data: existingUsers, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .limit(1);
      
    if (checkError) {
      console.error('❌ Erreur lors de la vérification du nom d\'utilisateur:', checkError);
    } else if (existingUsers && existingUsers.length > 0) {
      throw new Error('Ce nom d\'utilisateur est déjà utilisé. Veuillez en choisir un autre.');
    }
    
    console.log('✅ Vérification du nom d\'utilisateur réussie, création du compte...');
    
    // Créer l'utilisateur avec des métadonnées bien formatées
    const cleanUsername = username.trim();
    const cleanFirstName = firstName.trim() || cleanUsername;
    const cleanLastName = lastName.trim();
    
    // Créer un full_name combiné pour le trigger SQL qui l'attend
    const fullName = cleanFirstName + (cleanLastName ? ' ' + cleanLastName : '');
    
    console.log('🔧 Préparation des métadonnées utilisateur:', { 
      username: cleanUsername,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      full_name: fullName
    });
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          username: cleanUsername,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          full_name: fullName  // Ajout pour le trigger SQL
        },
        emailRedirectTo: window.location.origin + '/auth/callback'
      }
    })

    console.log('📝 Réponse de supabase.auth.signUp:', { signUpData, signUpError })
    
    if (signUpError) {
      console.error('❌ Erreur lors de la création du compte:', signUpError)
      // Améliorer les messages d'erreur
      if (signUpError.message.includes('already registered')) {
        throw new Error('Un compte existe déjà avec cet email')
      }
      throw signUpError
    }
    
    if (!signUpData.user) {
      throw new Error('Aucun utilisateur retourné après l\'inscription')
    }
    
    console.log('✅ Compte créé avec succès, tentative de connexion automatique...')
    
    // Attendre un court instant avant de tenter de se connecter
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    })
    
    if (signInError || !signInData?.user) {
      console.error('Erreur lors de la connexion automatique:', signInError)
      // On continue même en cas d'échec de connexion automatique
      return { 
        user: { 
          ...signUpData.user, 
          profile: { username, role: 'user', first_name: firstName, last_name: lastName }
        }, 
        error: null 
      }
    }
    
    return { user: signInData.user, error: null }
  } catch (error) {
    console.error('Erreur dans signUp:', error)
    return { user: null, error: error instanceof Error ? error : new Error('Erreur inconnue lors de l\'inscription') }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Erreur de connexion:', error)
      throw error
    }
    
    // Récupérer le profil utilisateur
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      return { 
        user: { ...data.user, profile },
        error: null 
      }
    }
    
    return { user: null, error: new Error('Aucun utilisateur retourné') }
  } catch (error) {
    console.error('Erreur dans signIn:', error)
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Erreur inconnue lors de la connexion')
    }
  }
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  console.log('Récupération des données du profil pour l\'utilisateur:', user.id)
  
  // Récupérer les informations du profil depuis les deux tables
  const [secureResult, profilesResult] = await Promise.all([
    // 1. Essayer d'abord secure_profiles (table principale)
    supabase
      .from('secure_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then((res: { data: any; error: any }) => ({
        data: res.data,
        error: res.error,
        source: 'secure_profiles'
      })),
    
    // 2. Essayer ensuite profiles (table originale)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then((res: { data: any; error: any }) => ({
        data: res.data,
        error: res.error,
        source: 'profiles'
      }))
  ])
  
  // Utiliser les données de secure_profiles en priorité, puis profiles
  const profileData = secureResult.data || profilesResult.data
  
  if (profileData) {
    console.log('Données du profil récupérées depuis:', 
      secureResult.data ? 'secure_profiles' : 
      profilesResult.data ? 'profiles' : 'aucune source')
  } else {
    console.warn('Aucune donnée de profil trouvée dans les tables')
  }

  return { ...user, profile: profileData }
}

export const isAdmin = async (userId: string) => {
  try {
    console.log('🔍 Vérification du statut admin pour l\'utilisateur:', userId)
    
    // Vérifier d'abord si on est connecté
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error)
      return false
    }
    
    // Afficher les métadonnées complètes pour le débogage
    console.log('📋 Métadonnées utilisateur:', {
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      raw_user_meta_data: user.app_metadata?.raw_app_meta_data
    })
    
    // Vérifier le rôle dans les métadonnées de l'application (app_metadata)
    const roles = user.app_metadata?.roles || []
    const rawRoles = user.app_metadata?.raw_app_meta_data?.roles || []
    const isAdmin = 
      (Array.isArray(roles) && roles.includes('admin')) ||
      (Array.isArray(rawRoles) && rawRoles.includes('admin'))
    
    console.log('✅ Statut admin vérifié:', { 
      userId, 
      isAdmin, 
      roles,
      rawRoles,
      hasAdminRole: isAdmin
    })
    
    return isAdmin
  } catch (error) {
    console.error('❌ Erreur dans isAdmin:', error)
    return false
  }
}
