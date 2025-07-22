import { supabase } from '../lib/supabase';
import { Category } from './types';

console.log('✅ categoryService chargé avec succès');

export const getCategories = async (): Promise<Category[]> => {
  try {
    console.log('🔄 Récupération des catégories depuis Supabase...');
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ ${data?.length || 0} catégories récupérées`);
    return data || [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catégories:', error);
    throw error;
  }
};

export const createCategory = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
  try {
    console.log('🔄 Création d\'une nouvelle catégorie...', categoryData);
    
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
    
    console.log('✅ Catégorie créée avec succès:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la catégorie:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  try {
    console.log(`🔄 Mise à jour de la catégorie ${id}...`, updates);
    
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
    
    console.log('✅ Catégorie mise à jour avec succès:', data);
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de la catégorie ${id}:`, error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<{ error?: any }> => {
  try {
    console.log(`🗑️ Suppression de la catégorie ${id}...`);
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log('✅ Catégorie supprimée avec succès');
    return {};
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression de la catégorie ${id}:`, error);
    return { error };
  }
};
