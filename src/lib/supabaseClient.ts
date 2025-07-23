import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises');
}

// Vérifier si une instance existe déjà dans la fenêtre globale
const _global = window as any;

if (!_global.__supabaseClient) {
  // Configuration améliorée avec options de persistance de session
  const config = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' as const,
      storageKey: 'popotte-auth-token',
      storage: localStorage,
    },
    db: {
      schema: 'public',
    },
    // Activer les logs en développement pour débogage
    debug: import.meta.env.DEV,
  };

  _global.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, config);
}

export const supabase = _global.__supabaseClient;
