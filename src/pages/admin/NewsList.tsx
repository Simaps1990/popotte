import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { NewsForm } from '../../components/admin/NewsForm';
import { type NewsPost } from '../../lib/supabase';
import { newsService } from '../../services/newsService';

export function NewsList() {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${getMonthName(month)} ${year} à ${hours}:${minutes}`;
  };
  
  const getMonthName = (month: string) => {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return months[parseInt(month) - 1];
  };

  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentPost, setCurrentPost] = useState<NewsPost | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        setIsLoading(true);
        const success = await newsService.deleteNews(postId);
        if (success) {
          setPosts(posts.filter(post => post.id !== postId));
          console.log(`Article ${postId} supprimé avec succès`);
        } else {
          throw new Error('Échec de la suppression');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'article', error);
        setError('Erreur lors de la suppression de l\'article');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleEditPost = (post: NewsPost) => {
    setCurrentPost(post);
    setShowForm(true);
  };
  
  // Charger les articles au chargement du composant
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allPosts = await newsService.getAllNews(false);
      setPosts(allPosts);
    } catch (err) {
      console.error('Erreur lors du chargement des articles:', err);
      setError('Impossible de charger les articles. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPost = () => {
    setCurrentPost(undefined);
    setShowForm(true);
  };
  
  const handleSavePost = async (post: NewsPost) => {
    try {
      setIsLoading(true);
      
      if (!post.id) {
        // Créer un nouvel article
        const newPost = await newsService.createNews({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || null,
          image_url: post.image_url || null,
          published: post.published,
          author_id: post.author_id
        });
        
        if (newPost) {
          setPosts([newPost, ...posts]);
          console.log('Nouvel article créé avec succès');
        }
      } else {
        // Mettre à jour un article existant
        const updatedPost = await newsService.updateNews(post.id, {
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || null,
          image_url: post.image_url || null,
          published: post.published
        });
        
        if (updatedPost) {
          setPosts(posts.map(p => p.id === post.id ? updatedPost : p));
          console.log('Article mis à jour avec succès');
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l\'article:', err);
      setError('Erreur lors de la sauvegarde de l\'article');
    } finally {
      setIsLoading(false);
      setShowForm(false);
      setCurrentPost(undefined);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setCurrentPost(undefined);
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <main className="container mx-auto px-4 py-6 max-w-2xl bg-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#10182a] text-center">Gestion des actualités</h1>
        </div>
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-[#10182a] hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </button>
        </div>
            
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              onClick={handleAddPost}
            >
              <Plus size={20} />
              <span>Nouvel article</span>
              <span>Retour</span>
            </button>
          </div>
            
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                onClick={handleAddPost}
              >
                <Plus size={20} />
                <span>Nouvel article</span>
              </button>
            </div>
            
            {showForm && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">💡 Les articles sont maintenant sauvegardés dans Supabase.</p>
                </div>
                <NewsForm 
                  post={currentPost} 
                  onSave={handleSavePost} 
                  onCancel={handleCancelForm} 
                />
              </div>
            )}
            
            <div className="space-y-4">
              {/* États de chargement et d'erreur */}
              {isLoading && (
                <div className="text-center p-8 bg-white rounded-lg">
                  <p className="text-gray-500">Chargement des articles...</p>
                </div>
              )}
              
              {error && (
                <div className="text-center p-8 bg-red-50 rounded-lg">
                  <p className="text-red-500">{error}</p>
                </div>
              )}
              
              {/* Message lorsqu'il n'y a pas d'articles */}
              {!isLoading && !error && posts.length === 0 && (
                <div className="text-center p-8 bg-white rounded-lg">
                  <p className="text-gray-500">Aucun article disponible. Cliquez sur "Nouvel article" pour en créer un.</p>
                </div>
              )}
              
              {!isLoading && !error && posts.map((post) => (
                <div key={post.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 text-[#10182a]">{post.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {formatDate(post.created_at)}
                      </p>
                      {post.excerpt && (
                        <p className="text-gray-600 mb-2 italic">{post.excerpt}</p>
                      )}
                      <p className="text-gray-600 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={() => handleEditPost(post)}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NewsList;
