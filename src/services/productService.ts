import { supabase } from '../lib/supabase';
import { Product, StockVariant } from './types';

export type ProductWithRelations = Product & {
  categories?: {
    name: string;
  };
  stock_variants?: StockVariant[];
};

// Récupère tous les produits avec leurs relations
const fetchProductWithRelations = async (productId: string) => {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError) throw productError;
  if (!product) return null;

  // Récupérer les variantes de stock si le produit en a
  let variants: StockVariant[] = [];
  if (product.stock_enabled) {
    const { data: stockVariants, error: variantsError } = await supabase
      .from('product_stock_variants')
      .select('*')
      .eq('product_id', productId);

    if (variantsError) throw variantsError;
    variants = stockVariants || [];
  }

  // Récupérer les infos de la catégorie
  let categoryName = '';
  if (product.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .single();
    
    if (category) {
      categoryName = category.name;
    }
  }

  return {
    ...product,
    stock_variants: variants,
    categories: categoryName ? { name: categoryName } : undefined
  };
};

import { getProducts as getSupabaseProducts } from '../lib/supabase';

export const getProducts = async (available?: boolean): Promise<ProductWithRelations[]> => {
  try {
    // Utiliser la fonction getProducts de supabase.ts avec le paramètre includeUnavailable
    // Si available est undefined, on récupère tous les produits (pour l'admin)
    // Si available est défini, on filtre selon ce critère
    const includeUnavailable = available === undefined;
    const products = await getSupabaseProducts(undefined, includeUnavailable);
    
    // Filtrer par disponibilité côté client si nécessaire
    const filteredProducts = available !== undefined 
      ? (products as Product[]).filter((p) => p.is_available === available)
      : products;
    
    // Formater les données pour correspondre à la structure attendue
    const formattedData = filteredProducts.map((product: any) => ({
      ...product,
      // Si on a besoin des variantes de stock pour l'administration, on les ajoute
      ...(product.stock_variants ? { stock_variants: product.stock_variants } : {}),
      categories: product.category_id ? {
        id: product.category_id,
        name: product.category_name
      } : null
    }));
    
    return formattedData;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits:', error);
    throw error;
  }
};

export const getProductById = async (id: string): Promise<ProductWithRelations | null> => {
  try {
    return await fetchProductWithRelations(id);
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération du produit ${id}:`, error);
    throw error;
  }
};

export const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ProductWithRelations> => {
  try {

    
    // Création du produit de base
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([{
        name: productData.name,
        description: productData.description || null,
        price: productData.price,
        category_id: productData.category_id || null,
        image_url: productData.image_url || null,
        is_available: productData.is_available,
        stock_enabled: productData.stock_enabled,
        stock_quantity: productData.stock_enabled && !productData.stock_variants?.length 
          ? productData.stock_quantity || 0 
          : null,
        display_order: productData.display_order || 0,
      }])
      .select()
      .single();
    
    if (productError) {
      console.error('❌ Erreur lors de la création du produit de base:', productError);
      throw productError;
    }
    
    if (!product) {
      console.error('❌ Produit non créé - données manquantes');
      throw new Error('Échec de la création du produit');
    }
    

    
    // Gestion des variantes de stock si activé
    if (productData.stock_enabled && productData.stock_variants?.length) {
      const variantsToInsert = (productData.stock_variants as StockVariant[]).map(variant => ({
        product_id: product.id,
        name: variant.name,
        quantity: variant.quantity,
        price_adjustment: variant.price_adjustment || 0
      }));
      

      
      const { error: variantsError } = await supabase
        .from('product_stock_variants')
        .insert(variantsToInsert);
      
      if (variantsError) {
        console.error('❌ Erreur lors de l\'ajout des variantes:', variantsError);
        throw variantsError;
      }
      

    }
    
    // Récupérer le produit avec toutes ses relations
    const fullProduct = await fetchProductWithRelations(product.id);
    
    if (!fullProduct) {
      console.error('❌ Impossible de récupérer le produit créé avec ses relations');
      throw new Error('Échec de la récupération du produit créé');
    }
    

    return fullProduct;
  } catch (error) {
    console.error('❌ Erreur lors de la création du produit:', error);
    throw error;
  }
};

/**
 * Met à jour plusieurs produits en une seule transaction
 * @param updates Un tableau d'objets contenant l'ID du produit et les mises à jour à effectuer
 */
export const updateMultipleProducts = async (updates: Array<{ id: string; updates: Partial<Product> }>) => {
  try {

    
    // Utilisation d'une transaction pour mettre à jour tous les produits en une seule requête
    const { data, error } = await supabase
      .rpc('batch_update_products', {
        updates: updates.map(({ id, updates: updateData }) => ({
          id,
          name: updateData.name || undefined,
          description: updateData.description || undefined,
          price: updateData.price || undefined,
          category_id: updateData.category_id || undefined,
          display_order: updateData.display_order
        }))
      });

    if (error) {
      console.error('❌ Erreur lors de la mise à jour des produits:', error);
      throw error;
    }


    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des produits:', error);
    throw error;
  }
};

/**
 * Met à jour un seul produit
 * @param id ID du produit à mettre à jour
 * @param updates Les champs à mettre à jour
 */
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<ProductWithRelations> => {
  try {

    
    // Extraire les stock_variants des mises à jour
    const { stock_variants, ...productUpdates } = updates;
    
    // Mise à jour du produit de base avec toutes les colonnes nécessaires

    
    // D'abord, récupérer le produit actuel

    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération du produit actuel:', fetchError);
      throw fetchError;
    }
    if (!currentProduct) {
      console.error('❌ Produit non trouvé');
      throw new Error('Produit non trouvé');
    }
    

    
    // Préparer les données de mise à jour (ne patcher que les champs explicitement modifiés)
    // Ne patcher que les champs vraiment modifiés (différents de la valeur actuelle)
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key in productUpdates) {
      if (key === 'updated_at') continue;
      const newValue = productUpdates[key as keyof typeof productUpdates];
      const oldValue = currentProduct[key];
      // On ignore si la valeur est identique (y compris pour 0), undefined, null ou string vide
      if (
        newValue === undefined ||
        newValue === null ||
        (typeof newValue === 'string' && newValue.trim() === '' && (!oldValue || oldValue === '')) ||
        (typeof newValue === 'number' && typeof oldValue === 'number' && newValue === oldValue) ||
        newValue === oldValue
      ) {
        continue;
      }
      updateData[key] = newValue;
    }

    // Si la seule modification est stock_quantity=0, inclure tous les champs obligatoires
    // Note: On a retiré la condition pour is_available=false pour permettre de rendre un produit indisponible
    if (
      (Object.keys(updateData).length === 2 && 
       Object.prototype.hasOwnProperty.call(updateData, 'stock_quantity') && 
       updateData.stock_quantity === 0)
    ) {
      // Inclure tous les champs non-nullables du produit courant
      updateData.name = currentProduct.name;
      updateData.price = currentProduct.price;
      updateData.category_id = currentProduct.category_id;
      // Ne pas écraser is_available s'il est explicitement modifié
      if (!Object.prototype.hasOwnProperty.call(updateData, 'is_available')) {
        updateData.is_available = currentProduct.is_available;
      }
      updateData.stock_enabled = currentProduct.stock_enabled;
      updateData.description = currentProduct.description ?? '';
      updateData.image_url = currentProduct.image_url ?? '';
      updateData.display_order = currentProduct.display_order;
    }

    if (Object.keys(updateData).length === 1) { // juste updated_at
      const fullProduct = await fetchProductWithRelations(id);
      if (!fullProduct) throw new Error('Produit non trouvé');
      return fullProduct;
    }
    
    // Mettre à jour le produit
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    
    if (productError) {
      console.error('❌ Erreur lors de la mise à jour du produit:', productError);
      throw productError;
    }
    if (!product) {
      console.error('❌ Produit non trouvé après mise à jour');
      throw new Error('Produit non trouvé après mise à jour');
    }
    
    // Si le stock est activé et qu'il y a des variantes, les créer
    if (updates.stock_enabled && stock_variants && stock_variants.length > 0) {
      // Supprimer les anciennes variantes
      const { error: deleteError } = await supabase
        .from('product_stock_variants')
        .delete()
        .eq('product_id', id);
      
      if (deleteError) {
        console.error('❌ Erreur lors de la suppression des anciennes variantes:', deleteError);
        throw deleteError;
      }
      
      // Ajouter les nouvelles variantes
      const variantsToInsert = (updates.stock_variants as StockVariant[]).map(variant => ({
        product_id: id,
        name: variant.name,
        quantity: variant.quantity,
        price_adjustment: variant.price_adjustment || 0
      }));
      
      const { error: variantsError } = await supabase
        .from('product_stock_variants')
        .insert(variantsToInsert);
      
      if (variantsError) {
        console.error('❌ Erreur lors de l\'insertion des nouvelles variantes:', variantsError);
        throw variantsError;
      }
    }
    
    // Récupérer le produit avec toutes ses relations
    const fullProduct = await fetchProductWithRelations(id);
    if (!fullProduct) {
      throw new Error('Échec de la récupération du produit mis à jour');
    }
    
    return fullProduct;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du produit ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  const supabaseClient = supabase;
  
  try {
    await supabaseClient.rpc('begin');
    
    // Supprimer d'abord les variantes de stock
    const { error: variantsError } = await supabaseClient
      .from('product_stock_variants')
      .delete()
      .eq('product_id', id);
    
    if (variantsError) throw variantsError;
    
    // Puis supprimer le produit
    const { error: productError } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', id);
    
    if (productError) throw productError;
    
    await supabaseClient.rpc('commit');
  } catch (error) {
    await supabaseClient.rpc('rollback');
    console.error(`❌ Erreur lors de la suppression du produit ${id}:`, error);
    throw error;
  }
};
