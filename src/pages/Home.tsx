import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, X } from 'lucide-react'
import { getNews, type NewsPost } from '../lib/supabase'
import { useRealTimeSubscriptions, useCacheInvalidation } from '../hooks/useRealTimeSubscriptions'


// Style pour supprimer les marges par défaut du body et html
const resetStyle = document.createElement('style')
resetStyle.textContent = `
  body, html {
    margin: 0 !important;
    padding: 0 !important;
  }
`
document.head.appendChild(resetStyle)

export function Home() {
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null)


  // Utiliser une référence pour suivre si l'effet a déjà été exécuté
  const effectRan = React.useRef(false);

  // Suppression de l'invalidation du cache qui cause les rechargements
  // const { invalidateCache } = useCacheInvalidation();

  // Callback pour les changements de news
  const handleNewsChange = React.useCallback(() => {
    fetchNewsPosts();
  }, []);

  // Abonnements temps réel
  useRealTimeSubscriptions({
    onNewsChange: handleNewsChange
  });

  useEffect(() => {
    // Ne s'exécute qu'une seule fois en mode développement avec React.StrictMode
    if (effectRan.current === false) {
      // Suppression de l'invalidation du cache
      fetchNewsPosts();
      effectRan.current = true;
    }
    
    // Nettoyage
    return () => {
      // Nettoyage de l'effet
    };
  }, [])

  const fetchNewsPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getNews();
      
      if (!Array.isArray(data)) {
        console.error('❌ Les données reçues ne sont pas un tableau:', data);
        throw new Error('Format de données invalide');
      }
      
      setNewsPosts(data);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      console.error('❌ Erreur dans fetchNewsPosts:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(`Impossible de charger les actualités: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }
  
  // Fonction pour recharger les actualités
  const handleRetry = () => {
    fetchNewsPosts()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Utiliser useEffect pour s'assurer que le header est bien positionné
  useEffect(() => {
    // Force le scroll en haut de la page
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!selectedImage) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedImage])

  return (
    <div className="w-full min-h-screen bg-white">
      {/* En-tête avec l'image - Positionné en haut de la page sans marge */}
      
      <div className="w-full py-4 pb-0">
        <div className="flex flex-col space-y-4">
          <h1 className="text-2xl font-bold text-[#10182a] text-center mb-4">Les nouveautés de la popote</h1>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#10182a] border-t-transparent"></div>
              <p className="text-[#10182a]">Chargement des actualités...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-[#10182a] hover:bg-blue-700"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          ) : newsPosts.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[#10182a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-[#10182a]">Aucune actualité</h3>
              <p className="mt-1 text-sm text-[#10182a]">Aucune actualité n'a été publiée pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {newsPosts.map((post) => (
                <article key={post.id} className="card mb-4 overflow-hidden bg-white border border-[#ddd] rounded-lg">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded-t-lg cursor-pointer"
                      onClick={() => setSelectedImage({ url: post.image_url as string, title: post.title })}
                    />
                  )}
                  <div className="p-4 space-y-3">
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <div className="flex items-center text-sm text-[#10182a]">
                      <Calendar size={16} className="mr-1" />
                      <span>Publié le {formatDate(post.created_at)}</span>
                    </div>
                    {post.excerpt && (
                      <p className="text-[#10182a] italic">
                        {post.excerpt}
                      </p>
                    )}
                    {post.content && (
                      <div className="text-gray-700 whitespace-pre-line">
                        {post.content}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu de l'image"
        >
          <div
            className="relative inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#10182a] shadow"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="block max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}