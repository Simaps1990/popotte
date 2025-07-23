import React, { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'

export function Auth() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const authAttempted = useRef(false)

  // Utiliser useEffect pour détecter les changements dans l'état user
  useEffect(() => {
    if (user && authAttempted.current) {
      console.log('✅ Utilisateur connecté, redirection vers la page d\'accueil')
      navigate('/', { replace: true })
    }
  }, [user, navigate])
  
  // Redirection immédiate si l'utilisateur est déjà connecté au chargement initial
  if (user && !authAttempted.current) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    authAttempted.current = true

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        // Vérifier que le nom d'utilisateur est unique et valide
        if (!username || username.trim().length < 3) {
          throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        }
        
        // Vérifier qu'il n'y a pas d'espaces ou de caractères spéciaux dans le nom d'utilisateur
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Le nom d\'utilisateur ne doit contenir que des lettres, chiffres et underscores')
        }
        
        console.log('Tentative d\'inscription avec:', { email, username, firstName, lastName })
        const result = await signUp(email, password, username, firstName, lastName)
        
        if (result && result.error) {
          console.error('Erreur lors de l\'inscription:', result.error)
          throw result.error
        }
        
        toast.success('Compte créé avec succès! Vous êtes maintenant connecté.')
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isLogin ? 'Connectez-vous à votre compte' : 'Rejoignez notre association'}
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">

            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Nom d'utilisateur
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required={!isLogin}
                    className="input mt-1"
                    placeholder="nom_utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Uniquement lettres, chiffres et underscores. Pas d'espaces.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      Prénom
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required={!isLogin}
                      className="input mt-1"
                      placeholder="Prénom"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Nom
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required={!isLogin}
                      className="input mt-1"
                      placeholder="Nom"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input mt-1"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer le compte'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-primary-500 hover:text-primary-600 text-sm"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}