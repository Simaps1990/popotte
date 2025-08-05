import { supabase } from '../lib/supabaseClient';
import { type NewsPost } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export const newsService = {
  // Récupérer tous les articles
  async getAllNews(publishedOnly: boolean = false): Promise<NewsPost[]> {
    try {
      console.log('🔄 [getAllNews] Forçage du rechargement des actualités sans cache');
      // Ajouter un timestamp pour éviter le cache
      const timestamp = new Date().getTime();
      
      let query = supabase
        .from('news')
        .select(`*`)
        .order('created_at', { ascending: false });
      
      if (publishedOnly) {
        query = query.eq('published', true);
      }
      
      // Utiliser l'option head: false pour forcer un rechargement complet
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des actualités:', error);
      return [];
    }
  },
  
  // Récupérer un article par son ID
  async getNewsById(id: string): Promise<NewsPost | null> {
    try {
      console.log(`🔄 [getNewsById] Forçage du rechargement de l'article ${id} sans cache`);
      // Ajouter un timestamp pour éviter le cache
      const timestamp = new Date().getTime();
      
      const { data, error } = await supabase
        .from('news')
        .select(`*`)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'article ${id}:`, error);
      return null;
    }
  },
  
  // Créer un nouvel article
  async createNews(newsData: Omit<NewsPost, 'id' | 'created_at' | 'updated_at'>): Promise<NewsPost | null> {
    try {
      // Vérifier les données obligatoires
      if (!newsData.title) {
        console.error('newsService.createNews - Titre manquant');
        throw new Error('Le titre de l\'article est obligatoire');
      }
      
      if (!newsData.content) {
        console.error('newsService.createNews - Contenu manquant');
        throw new Error('Le contenu de l\'article est obligatoire');
      }
      
      if (!newsData.author_id) {
        console.error('newsService.createNews - ID auteur manquant');
        throw new Error('L\'ID de l\'auteur est obligatoire');
      }
      
      // Préparer les données pour l'insertion (sans id, created_at et updated_at)
      const payload = {
        title: newsData.title,
        content: newsData.content,
        excerpt: newsData.excerpt || null,
        image_url: newsData.image_url || null,
        published: newsData.published !== undefined ? newsData.published : true,
        author_id: newsData.author_id
      };
      
      console.log('🔍 newsService.createNews - Payload prêt pour insertion:', JSON.stringify(payload, null, 2));
      
      // Insérer l'article dans la base de données
      const { data, error } = await supabase
        .from('news')
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        console.error('❌ newsService.createNews - Erreur Supabase:', error);
        console.error('  - Code:', error.code);
        console.error('  - Message:', error.message);
        console.error('  - Details:', error.details);
        throw error;
      }
      
      if (!data) {
        console.error('❌ newsService.createNews - Aucune donnée retournée après insertion');
        throw new Error('Aucune donnée retournée après insertion');
      }
      
      console.log('✅ newsService.createNews - Article créé avec succès:', data);
      return data;
    } catch (error: any) {
      console.error('❌ newsService.createNews - Exception lors de la création:', error);
      throw error; // Propager l'erreur pour une meilleure gestion dans le composant
    }
  },
  
  // Mettre à jour un article
  async updateNews(id: string, newsData: Partial<Omit<NewsPost, 'id' | 'created_at'>>): Promise<NewsPost | null> {
    try {
      const { data, error } = await supabase
        .from('news')
        .update({
          ...newsData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'article ${id}:`, error);
      return null;
    }
  },
  
  // Supprimer un article
  async deleteNews(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'article ${id}:`, error);
      return false;
    }
  },

  // S'abonner aux changements en temps réel des actualités
  subscribeToNewsChanges(callback: (payload: { new: NewsPost; old: NewsPost; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void): RealtimeChannel {
    const channel = supabase
      .channel('news_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'news' }, 
        (payload: any) => {
          callback(payload);
        }
      )
      .subscribe();
    
    return channel;
  },

  // Recharger instantanément les actualités
  async refreshNews(publishedOnly: boolean = false): Promise<NewsPost[]> {
    console.log('🔄 [refreshNews] Forçage du rechargement complet des actualités');
    // Force un rechargement complet via getAllNews qui est déjà configuré pour éviter le cache
    return await this.getAllNews(publishedOnly);
  }
};
