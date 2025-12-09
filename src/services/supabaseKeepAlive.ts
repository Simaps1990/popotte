import { supabase } from '../lib/supabaseClient';

// Configuration
const PING_INTERVAL = 12 * 60 * 60 * 1000; // Toutes les 12 heures
const MIN_PING_INTERVAL = 1 * 60 * 60 * 1000; // 1 heure minimum entre les pings

class SupabaseKeepAlive {
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPing: number = 0;
  private isActive: boolean = false;

  // Démarrer le service
  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    console.log('🚀 Service Supabase Keep-Alive démarré');
    
    // Premier ping immédiat
    this.pingSupabase();
    
    // Puis régulièrement selon l'intervalle défini
    this.pingInterval = setInterval(() => {
      this.pingSupabase();
    }, PING_INTERVAL);
  }

  // Arrêter le service
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.isActive = false;
    console.log('🛑 Service Supabase Keep-Alive arrêté');
  }

  // Effectuer un ping léger vers Supabase
  private async pingSupabase() {
    const now = Date.now();
    
    // Vérifier si le dernier ping est trop récent
    if (now - this.lastPing < MIN_PING_INTERVAL) {
      console.log('⏭️ Ping ignoré (trop tôt après le précédent)');
      return;
    }

    try {
      console.log('🔄 Ping vers Supabase en cours...');
      
      // Requête légère sur la table news (qui est généralement publique)
      const { data, error } = await supabase
        .from('news')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      this.lastPing = Date.now();
      console.log(`✅ Ping réussi à ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('❌ Erreur lors du ping Supabase:', error);
    }
  }
}

// Export d'une instance unique
export const supabaseKeepAlive = new SupabaseKeepAlive();
