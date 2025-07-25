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
    
    // Redirection immédiate si utilisateur connecté et loading terminé
    if (user && !loading) {
      console.log('🚀 AuthPage - Redirection IMMÉDIATE vers / car utilisateur connecté')
      navigate('/', { replace: true })
      return
    }
    
    // Vérification différée pour gérer le décalage de timing
    const checkUserWithDelay = setTimeout(() => {
      console.log('⏰ AuthPage - Vérification différée après 1s:', {
        user: user ? 'connecté' : 'non connecté',
        loading,
        pathname: window.location.pathname
      })
      
      if (user && window.location.pathname === '/auth') {
        console.log('🔄 AuthPage - Redirection différée détectée, redirection forcée')
        navigate('/', { replace: true })
        
        // Double sécurité avec window.location si navigate échoue
        setTimeout(() => {
          if (window.location.pathname === '/auth') {
            console.log('🆘 AuthPage - Navigate a échoué, redirection window.location')
            window.location.href = '/'
          }
        }, 500)
      }
    }, 1000)
    
    return () => clearTimeout(checkUserWithDelay)
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
