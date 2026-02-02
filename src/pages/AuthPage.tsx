import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthForm } from '../components/AuthForm'
import { BottomNavigation } from '../components/BottomNavigation'

export function AuthPage() {
  console.log('AuthPage monté')
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('🔍 AuthPage useEffect - État:', { 
      user: user ? 'connecté' : 'non connecté', 
      loading,
      userId: user?.id,
      email: user?.email 
    })
    
    // Redirection immédiate si utilisateur connecté et loading terminé
    if (user && !loading) {
      console.log('🚀 AuthPage - Redirection IMMÉDIATE vers / car utilisateur connecté')
      navigate('/', { replace: true })
      return
    }
  }, [user, loading, navigate])

  // Header/logo centré
  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header/logo centré, fond blanc, cohérent avec le site */}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Connexion
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 rounded-2xl sm:px-10 border border-gray-100 shadow-sm">
          <AuthForm />
        </div>
      </div>
    </div>
    <BottomNavigation />
    </>
  )
}
