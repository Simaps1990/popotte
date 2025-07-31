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
  const [error, setError] = useState('');
  
  // Récupérer l'utilisateur connecté
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Récupérer l'utilisateur connecté au chargement du composant
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
  }, []);

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
          // Télécharger le fichier
          const { data, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (uploadError) {
            lastError = uploadError;
            continue;
          }
          
          // Récupérer l'URL publique du fichier téléchargé
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
          
          if (urlData && urlData.publicUrl) {
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
      // Vérifier les champs obligatoires
      if (!title.trim()) {
        alert('Le titre est obligatoire');
        setIsLoading(false);
        return;
      }
      
      if (!content.trim()) {
        alert('Le contenu est obligatoire');
        setIsLoading(false);
        return;
      }
      
      // Vérifier que l'utilisateur est connecté
      if (!user?.id) {
        alert('Vous devez être connecté pour créer ou modifier un article');
        setIsLoading(false);
        return;
      }
      
      let finalImageUrl = post?.image_url || '';
      
      // Si une nouvelle image a été sélectionnée, la télécharger
      if (imageFile) {
        try {
          console.log('📷 Début du téléchargement de l\'image...');
          
          // Générer un nom de fichier unique
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          
          // Essayer d'abord avec le bucket 'news'
          let { data: uploadData, error: uploadError } = await supabase.storage
            .from('news')
            .upload(fileName, imageFile);
          
          // Si échec avec le bucket 'news', essayer avec 'public'
          if (uploadError) {
            console.error('⚠️ Erreur lors du téléchargement dans le bucket "news":', uploadError);
            console.log('🔄 Tentative avec le bucket "public"...');
            
            const { data: publicUploadData, error: publicUploadError } = await supabase.storage
              .from('public')
              .upload(fileName, imageFile);
            
            if (publicUploadError) {
              console.error('❌ Erreur lors du téléchargement dans le bucket "public":', publicUploadError);
              throw new Error(`Erreur lors du téléchargement de l'image: ${publicUploadError.message}`);
            }
            
            uploadData = publicUploadData;
            finalImageUrl = supabase.storage.from('public').getPublicUrl(fileName).data.publicUrl;
            console.log('✅ Image téléchargée dans le bucket "public":', finalImageUrl);
          } else {
            finalImageUrl = supabase.storage.from('news').getPublicUrl(fileName).data.publicUrl;
            console.log('✅ Image téléchargée dans le bucket "news":', finalImageUrl);
          }
          
        } catch (imageError: any) {
          console.error('❌ Erreur lors du téléchargement de l\'image:', imageError);
          alert(`Erreur lors du téléchargement de l'image: ${imageError.message}`);
          setIsLoading(false);
          return;
        }
      }
      
      // Préparer les données du post
      const postData: NewsPost = {
        id: post?.id || `temp-${Date.now()}`, // ID temporaire pour les nouveaux posts
        title,
        content,
        excerpt,
        image_url: finalImageUrl,
        published,
        author_id: user.id, // Utiliser l'ID de l'utilisateur connecté
        created_at: post?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📦 Données du post prêtes à être envoyées:', JSON.stringify(postData, null, 2));
      
      // Appeler la fonction onSave pour sauvegarder le post
      await onSave(postData);
      
      // Réinitialiser le formulaire après succès
      resetForm();
      console.log('✅ Formulaire soumis avec succès');
    } catch (submitError: any) {
      console.error('❌ Erreur lors de la soumission du formulaire:', submitError);
      setError(`Erreur lors de la sauvegarde: ${submitError.message}`);
      alert(`Erreur lors de la sauvegarde: ${submitError.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setImageUrl('');
    setPublished(true);
    setImageFile(null);
    setPreviewUrl(null);
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
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-gradient-to-r from-[#10182a] to-[#2a4365] text-white hover:opacity-90 transition-opacity"
          >
            <Save size={20} />
            <span>{isEditing ? 'Modifier' : 'Publier'}</span>
          </button>
          <button
            type="button"
            className="flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-gray-300 to-gray-200 text-gray-700 hover:opacity-90 transition-opacity"
            onClick={onCancel}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};
