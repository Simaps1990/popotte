import { supabase } from '../lib/supabaseClient';
import { type NewsPost } from '../lib/supabase';

export const newsService = {
  // Récupérer tous les articles
  async getAllNews(publishedOnly: boolean = false): Promise<NewsPost[]> {
    try {
      let query = supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (publishedOnly) {
        query = query.eq('published', true);
      }
      
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
      const { data, error } = await supabase
        .from('news')
        .select('*')
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
      const { data, error } = await supabase
        .from('news')
        .insert([{
          ...newsData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la création de l\'article:', error);
      return null;
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
  }
};
