import React, { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { mockDatabase } from '../../lib/mockDatabase'
import { ImageUpload } from '../../components/ImageUpload'
import type { NewsPost } from '../../lib/mockData'

export function News() {
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

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const data = await mockDatabase.getNews()
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPost) {
        await mockDatabase.updateNews(editingPost.id, {
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || null,
          image_url: formData.image_url || null,
          published: formData.published
        })
      } else {
        await mockDatabase.createNews({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt || null,
          image_url: formData.image_url || null,
          published: formData.published
        })
      }

      setFormData({ title: '', content: '', excerpt: '', image_url: '', published: true })
      setEditingPost(null)
      setIsCreating(false)
      fetchPosts()
      alert(editingPost ? 'Article modifié !' : 'Article créé !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleEdit = (post: NewsPost) => {
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return

    try {
      await mockDatabase.deleteNews(postId)
      fetchPosts()
      alert('Article supprimé !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleCancel = () => {
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
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Mode démonstration - Les articles sont stockés temporairement.
        </p>
      </div>

      <div className="flex items-center justify-between">
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nouvel article</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingPost ? 'Modifier l\'article' : 'Nouvel article'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
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
                className="input mt-1"
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
                className="input mt-1"
                placeholder="Résumé court de l'article"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image de l'article
              </label>
              <ImageUpload
                value={formData.image_url}
                onChange={(imageData) => setFormData({ ...formData, image_url: imageData || '' })}
                placeholder="Ajouter une image pour l'article"
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
                className="input mt-1 h-32 resize-none"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="published"
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
                Publier l'article
              </label>
            </div>

            <div className="flex space-x-2">
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save size={20} />
                <span>{editingPost ? 'Modifier' : 'Créer'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucun article trouvé.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="card">
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}