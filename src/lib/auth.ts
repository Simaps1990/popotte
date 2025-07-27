import { supabase } from './supabase'

export interface SignUpParams {
  email: string
  password: string
  username: string
  firstName?: string
  lastName?: string
}

export const signUp = async ({ email, password, username, firstName = '', lastName = '' }: SignUpParams) => {
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
    
    // Créer l'utilisateur avec des métadonnées bien formatées
    const cleanUsername = username.trim();
    const cleanFirstName = firstName.trim() || cleanUsername;
    const cleanLastName = lastName.trim();
    
    // Créer un full_name combiné pour le trigger SQL qui l'attend
    const fullName = cleanFirstName + (cleanLastName ? ' ' + cleanLastName : '');
    

    
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
    console.log('🔑 Tentative de connexion avec email:', email);
    
    // Connexion avec Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Garantir que la session est persistante
        persistSession: true
      }
    });
    
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      throw error;
    }
    
    console.log('✅ Connexion réussie, session créée');
    
    // Vérifier que la session a bien été créée
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('🔍 Vérification de la session après connexion:', 
      sessionData?.session ? 'Session active' : 'Pas de session active');
    
    // Récupérer le profil utilisateur
    if (data.user) {
      console.log('🔍 Récupération du profil pour:', data.user.id);
      
      // Essayer d'abord la table secure_profiles (prioritaire)
      let profile = null;
      const { data: secureProfile, error: secureProfileError } = await supabase
        .from('secure_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (secureProfileError && secureProfileError.code !== 'PGRST116') {
        console.warn('⚠️ Erreur lors de la récupération du profil sécurisé:', secureProfileError);
      }
      
      // Si pas de profil sécurisé, essayer la table profiles standard
      if (!secureProfile) {
        const { data: standardProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        profile = standardProfile;
      } else {
        profile = secureProfile;
      }
      
      console.log('✅ Profil récupéré:', profile ? 'OK' : 'Non trouvé');
      
      return { 
        user: { ...data.user, profile },
        error: null 
      };
    }
    
    console.warn('⚠️ Connexion réussie mais aucun utilisateur retourné');
    return { user: null, error: new Error('Aucun utilisateur retourné') };
  } catch (error) {
    console.error('❌ Erreur dans signIn:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Erreur inconnue lors de la connexion')
    }
  }
}

export const signOut = async () => {
  try {
    console.log('🔒 Déconnexion en cours...');
    
    // Déconnexion complète (y compris suppression des sessions persistantes)
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      throw error;
    }
    
    console.log('✅ Déconnexion réussie');
    
    // Forcer un petit délai pour permettre à Supabase de terminer les opérations de nettoyage
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { error: null };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la déconnexion:', error);
    return { error };
  }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null


  
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
  


  return { ...user, profile: profileData }
}

export const isAdmin = async () => {
  try {

    
    // Vérifier d'abord si on est connecté
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error)
      return false
    }
    

    
    // Vérifier le rôle dans les métadonnées de l'application (app_metadata)
    const roles = user.app_metadata?.roles || [];
    const rawRoles = user.app_metadata?.raw_app_meta_data?.roles || [];
    let isAdmin =
      (Array.isArray(roles) && roles.includes('admin')) ||
      (Array.isArray(rawRoles) && rawRoles.includes('admin'));
    
    // Vérification supplémentaire via le profil (secure_profiles ou profiles)
    let profileRole = null;
    try {
      const [secureResult, profilesResult] = await Promise.all([
        supabase
          .from('secure_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then((res: { data: any; error: any }) => ({
            data: res.data,
            error: res.error,
            source: 'secure_profiles',
          })),
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then((res: { data: any; error: any }) => ({
            data: res.data,
            error: res.error,
            source: 'profiles',
          })),
      ]);
      profileRole = secureResult.data?.role || profilesResult.data?.role;
      if (!isAdmin && profileRole === 'admin') {
        isAdmin = true;
      }
    } catch (err) {
      console.warn('Erreur lors de la récupération du rôle depuis le profil:', err);
    }



    return isAdmin;
  } catch (error) {
    console.error('❌ Erreur dans isAdmin:', error)
    return false
  }
}
