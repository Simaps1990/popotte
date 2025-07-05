import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Calendar } from 'lucide-react'
import { mockDatabase } from '../lib/mockDatabase'
import { useAuth } from '../contexts/AuthContext'
import type { NewsPost } from '../lib/mockData'

const logoUrl = '/ChatGPT Image 4 juil. 2025, 23_49_33.png'

export function Home() {
  const { profile } = useAuth()
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNewsPosts()
  }, [])

  const fetchNewsPosts = async () => {
    try {
      const data = await mockDatabase.getNews(true)
      setNewsPosts(data)
    } catch (error) {
      console.error('Error fetching news posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-6">
        <img 
          src={logoUrl} 
          alt="Popotte Association Logo" 
          className="w-48 h-48 object-contain"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Les nouveautés de la popotte</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : newsPosts.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucune actualité pour le moment.</p>
          </div>
        ) : (
          newsPosts.map((post) => (
            <article key={post.id} className="card">
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Calendar size={16} />
                <span>{formatDate(post.created_at)}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
              {post.excerpt && (
                <p className="text-gray-600 mb-2 italic">{post.excerpt}</p>
              )}
              <p className="text-gray-600 whitespace-pre-wrap">{post.content}</p>
            </article>
          ))
        )}
      </div>
    </div>
  )
}