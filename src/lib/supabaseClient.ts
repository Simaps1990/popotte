import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises');
}

console.log('🔑 Initialisation du client Supabase avec URL:', supabaseUrl);
console.log('🔑 Clé anonyme présente:', !!supabaseAnonKey);

// Vérifier si une instance existe déjà dans la fenêtre globale
const _global = window as any;

// NE PAS réinitialiser le client existant pour éviter de casser la déconnexion
if (!_global.__supabaseClient) {
  // Configuration optimisée pour garantir l'accès anonyme et la persistance de session
  const config = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' as const,
      storageKey: 'popotte-auth-token',
      storage: localStorage,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.x'
      },
    },
    db: {
      schema: 'public',
    },
    // Activer les logs en développement uniquement
    debug: import.meta.env.DEV,
  };

  console.log('🔑 Création d\'un nouveau client Supabase avec configuration:', JSON.stringify(config));
  _global.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, config);
  console.log('🔑 Client Supabase créé avec succès');
}

export const supabase = _global.__supabaseClient;

// Vérifier que le client est correctement configuré pour l'accès anonyme
supabase.auth.onAuthStateChange((event: string, session: any) => {
  console.log('🔑 Événement d\'authentification Supabase:', event, session ? 'Session active' : 'Pas de session');
});

// Tester l'accès anonyme aux actualités
supabase.from('news').select('count').eq('published', true).then(({ data, error }: { data: any, error: any }) => {
  if (error) {
    console.error('❌ Test d\'accès anonyme aux actualités échoué:', error);
  } else {
    console.log('✅ Test d\'accès anonyme aux actualités réussi:', data);
  }
});

// Exporter une fonction pour tester la déconnexion
export const testSignOut = async () => {
  try {
    console.log('🔑 Test de déconnexion...');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('❌ Test de déconnexion échoué:', error);
      return { success: false, error };
    }
    console.log('✅ Test de déconnexion réussi');
    return { success: true, error: null };
  } catch (e) {
    console.error('❌ Erreur lors du test de déconnexion:', e);
    return { success: false, error: e };
  }
};
