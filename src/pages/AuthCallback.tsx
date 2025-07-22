import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session) {
          // L'utilisateur est connecté, rediriger vers la page d'accueil
          navigate('/')
        } else {
          // Aucune session trouvée, rediriger vers la page de connexion
          navigate('/auth')
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error)
        navigate('/auth')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Vérification en cours...</h1>
        <p>Veuillez patienter pendant que nous vous connectons à votre compte.</p>
      </div>
    </div>
  )
}
