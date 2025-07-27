import { supabase } from '../lib/supabase';
import { Category } from './types';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catégories:', error);
    throw error;
  }
};

export const createCategory = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        ...categoryData,
        slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
        is_active: categoryData.is_active !== false,
        display_order: categoryData.display_order || 0,
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la catégorie:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de la catégorie ${id}:`, error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<{ error?: any }> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return {};
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression de la catégorie ${id}:`, error);
    return { error };
  }
};
