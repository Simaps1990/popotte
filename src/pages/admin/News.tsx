import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, X, ArrowLeft } from 'lucide-react'
import { NewsPageLayout } from '../../components/admin/NewsPageLayout'
import { newsService } from '../../services/newsService'
import { type NewsPost } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import '../../styles/news.css'

// Page de gestion des actualités - strictement calquée sur la structure de Products.tsx
const News = () => {
  const navigate = useNavigate();
  const { user } = useAuth()
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    image_url: '',
    published: true
  })

  // Fonction pour créer un nouvel article (bouton "Nouvel article")
  const handleNewArticleClick = () => {
    console.log('Bouton Nouvel article cliqué')
    // Réinitialiser le formulaire
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      image_url: '',
      published: true
    })
    setEditingPost(null)
    setIsCreating(true)
  }

  useEffect(() => {
    console.log('Composant News monté')
    // Supprimer tous les articles existants au chargement initial
    deleteAllArticles()
    // Puis charger les articles (s'il en reste)
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      console.log('Récupération des articles...')
      const data = await newsService.getAllNews()
      console.log('Articles récupérés:', data)
      setPosts(data)
    } catch (error) {
      console.error('Erreur lors de la récupération des articles:', error)
      toast.error('Erreur lors du chargement des actualités')
    } finally {
      setLoading(false)
    }
  }
  
  // Fonction pour supprimer TOUS les articles
  const deleteAllArticles = async () => {
    try {
      console.log('Suppression de tous les articles...')
      const data = await newsService.getAllNews()
      console.log(`${data.length} articles à supprimer`)
      
      // Supprimer chaque article
      for (const article of data) {
        await newsService.deleteNews(article.id)
        console.log(`Article supprimé: ${article.title}`)
      }
      
      toast.success('Tous les articles ont été supprimés')
      // Rafraîchir la liste après suppression
      fetchPosts()
    } catch (error) {
      console.error('Erreur lors de la suppression des articles:', error)
      toast.error('Erreur lors de la suppression des articles')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Soumission du formulaire')
    
    // Validation des champs obligatoires
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Le titre et le contenu sont obligatoires')
      return
    }
    
    try {
      // Afficher un toast de chargement
      toast.loading(editingPost ? 'Modification en cours...' : 'Création en cours...')
      
      if (editingPost) {
        console.log('Modification d\'un article existant:', editingPost.id)
        await newsService.updateNews(editingPost.id, {
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || null,
          image_url: formData.image_url || null,
          published: formData.published
        })
      } else {
        console.log('Création d\'un nouvel article')
        await newsService.createNews({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || null,
          image_url: formData.image_url || null,
          published: formData.published,
          author_id: user?.id || ''
        })
      }

      setFormData({ title: '', content: '', excerpt: '', image_url: '', published: true })
      setEditingPost(null)
      setIsCreating(false)
      fetchPosts()
      toast.dismiss()
      toast.success(editingPost ? 'Article modifié avec succès !' : 'Article créé avec succès !')
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error)
      toast.dismiss()
      toast.error('Erreur : ' + (error.message || 'Une erreur est survenue'))
    }
  }

  const handleEdit = (post: NewsPost) => {
    console.log('Édition de l\'article:', post.id)
    setEditingPost(post)
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      image_url: post.image_url || '',
      published: post.published
    })
    setIsCreating(true)
  }

  const handleDelete = async (postId: string) => {
    console.log('Suppression de l\'article:', postId)
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return

    try {
      toast.loading('Suppression en cours...')
      await newsService.deleteNews(postId)
      fetchPosts()
      toast.dismiss()
      toast.success('Article supprimé avec succès !')
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      toast.dismiss()
      toast.error('Erreur : ' + (error.message || 'Une erreur est survenue'))
    }
  }

  const handleCancel = () => {
    console.log('Annulation du formulaire')
    setFormData({ title: '', content: '', excerpt: '', image_url: '', published: true })
    setEditingPost(null)
    setIsCreating(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen pb-20 relative bg-white" style={{ background: '#fff' }}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <NewsPageLayout>
      <div className="w-full min-h-screen pb-20 relative bg-white">
        <div className="max-w-3xl mx-auto py-8 px-4">
          {/* Header strictement identique à Products.tsx */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#10182a] text-left">Gestion des actualités</h1>
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Retour"
            >
              <ArrowLeft size={24} />
            </button>
          </div>
          {/* Bouton "Nouvel article" ferré à gauche, rouge */}
          <div className="mb-6">
            <button
              onClick={handleNewArticleClick}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Nouvel article</span>
            </button>
          </div>
          {/* Formulaire de création/modification d'article */}
          {isCreating && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingPost ? "Modifier l'article" : "Nouvel article"}</h3>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={handleCancel}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Titre
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                    URL de l'image (optionnel)
                  </label>
                  <input
                    id="image_url"
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Contenu
                  </label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="published" className="ml-2 block text-sm text-[#10182a]">
                    Publier l'article
                  </label>
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                    <Save size={20} />
                    <span>{editingPost ? 'Modifier' : 'Créer'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* Liste des actualités sous forme de cartes */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500">Aucun article trouvé.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg shadow-sm border border-gray-200 bg-white">
                  <div className="flex-1">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-[#10182a]">{post.title}</h3>
                      {!post.published && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Brouillon
                        </span>
                      )}
                    </div>
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
                      onClick={() => handleEdit(post)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </NewsPageLayout>
  );
}

export { News };
export default News;