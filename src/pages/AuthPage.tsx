import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthForm } from '../components/AuthForm'

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
    
    if (user && !loading) {
      console.log('🚀 AuthPage - Redirection forcée vers / car utilisateur connecté')
      
      // Méthode 1: React Router navigate
      navigate('/', { replace: true })
      
      // Méthode 2: Redirection forcée après délai (au cas où navigate échoue)
      setTimeout(() => {
        if (window.location.pathname === '/auth') {
          console.log('🔄 AuthPage - Navigate a échoué, redirection window.location')
          window.location.href = '/'
        }
      }, 500)
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Bienvenue sur Popotte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connectez-vous ou créez un compte pour continuer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
