import { supabase } from '../lib/supabase';

/**
 * Upload an image file to Supabase Storage and return the public URL
 * @param file File object to upload
 * @param folder Folder in the bucket (default: 'products')
 * @returns public URL string
 */
export async function uploadProductImage(file: File, folder = 'products'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });
  if (error) throw error;
  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}
