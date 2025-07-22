import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { type NewsPost } from '../../lib/supabase';
import { supabase } from '../../lib/supabaseClient';

interface NewsFormProps {
  post?: NewsPost;
  onSave: (post: NewsPost) => void;
  onCancel: () => void;
}

export const NewsForm: React.FC<NewsFormProps> = ({ post, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!post;

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setExcerpt(post.excerpt || '');
      setContent(post.content);
      setImageUrl(post.image_url || '');
      setPreviewUrl(post.image_url || '');
      setPublished(post.published !== undefined ? post.published : true);
    }
  }, [post]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Créer une URL pour la prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setImageUrl('');
  };

  // Note: La fonction getAvailableBucket a été remplacée par une approche plus directe
  // qui essaie plusieurs buckets connus dans la fonction uploadImage

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Vérifier si le fichier existe
      if (!file) {
        console.error('Aucun fichier fourni');
        return null;
      }

      // Essayer plusieurs buckets connus directement au lieu de lister les buckets
      const bucketOptions = ['public', 'storage', 'images', 'news', 'uploads', 'media', 'assets'];
      let uploadSuccess = false;
      let publicUrl = null;
      let lastError = null;
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `news/${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
      
      // Essayer chaque bucket jusqu'à ce qu'un upload réussisse
      for (const bucketName of bucketOptions) {
        if (uploadSuccess) break;
        
        try {
          console.log(`Tentative d'upload vers le bucket "${bucketName}" avec le chemin "${fileName}"`);
          
          // Télécharger le fichier
          const { data, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (uploadError) {
            console.log(`Échec avec le bucket "${bucketName}": ${uploadError.message}`);
            lastError = uploadError;
            continue;
          }
          
          // Récupérer l'URL publique du fichier téléchargé
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
          
          if (urlData && urlData.publicUrl) {
            console.log(`Image téléchargée avec succès dans "${bucketName}": ${urlData.publicUrl}`);
            publicUrl = urlData.publicUrl;
            uploadSuccess = true;
            break;
          }
        } catch (error) {
          console.error(`Erreur lors de la tentative sur le bucket "${bucketName}":`, error);
          lastError = error;
        }
      }
      
      if (!uploadSuccess) {
        console.error('Échec de l\'upload sur tous les buckets disponibles. Dernière erreur:', lastError);
        console.log('Pour résoudre ce problème, créez un bucket dans Supabase Storage via l\'interface d\'administration.');
        return null;
      }
      
      return publicUrl;
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      alert('Erreur lors du téléchargement de l\'image. L\'article sera créé sans image.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Récupérer l'ID de l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      // Upload de l'image si une nouvelle image est sélectionnée
      let finalImageUrl = imageUrl;
      let uploadError = null;
      
      if (imageFile) {
        try {
          const uploadedUrl = await uploadImage(imageFile);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
          } else {
            uploadError = 'Impossible de télécharger l\'image. L\'article sera créé sans image.';
          }
        } catch (error) {
          console.error('Erreur lors de l\'upload de l\'image:', error);
          uploadError = 'Erreur lors du téléchargement de l\'image. L\'article sera créé sans image.';
        }
      }
      
      // Préparer les données à sauvegarder
      const postData: Omit<NewsPost, 'id' | 'created_at' | 'updated_at'> = {
        title,
        content,
        excerpt: excerpt || null,
        image_url: finalImageUrl || null,
        published,
        author_id: user.id
      };
      
      // Sauvegarder l'article
      if (isEditing && post) {
        // Mise à jour d'un article existant
        const updatedPost = { ...post, ...postData };
        onSave(updatedPost);
      } else {
        // Création d'un nouvel article
        onSave(postData as NewsPost);
      }
      
      // Afficher un message d'erreur concernant l'image si nécessaire
      if (uploadError) {
        alert(uploadError);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'article:', error);
      alert('Une erreur est survenue lors de la sauvegarde de l\'article.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
        </h3>
        <button 
          className="text-gray-500 hover:text-gray-700"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </div>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Titre
          </label>
          <input
            id="title"
            type="text"
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
            Extrait (optionnel)
          </label>
          <input
            id="excerpt"
            type="text"
            className="input mt-1"
            placeholder="Résumé court de l'article"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image de l'article
          </label>
          <div className="space-y-2">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  onClick={handleRemoveImage}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <p className="text-gray-500">Cliquez pour ajouter une image</p>
              </div>
            )}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Contenu
          </label>
          <textarea
            id="content"
            className="input mt-1 h-32 resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="published"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
            Publier l'article
          </label>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            className="btn-primary flex items-center space-x-2"
          >
            <Save size={20} />
            <span>{isEditing ? 'Modifier' : 'Publier'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};
