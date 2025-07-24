import { useState, useEffect } from 'react'
import { signIn, signUp } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

type AuthMode = 'login' | 'signup'

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaNum1, setCaptchaNum1] = useState(0)
  const [captchaNum2, setCaptchaNum2] = useState(0)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const navigate = useNavigate()

  // Générer des nombres aléatoires pour le CAPTCHA
  useEffect(() => {
    generateCaptcha()
  }, [])

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    setCaptchaNum1(num1)
    setCaptchaNum2(num2)
    setCaptchaAnswer('')
    setCaptchaError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Soumission du formulaire en cours...')
    setError('')
    setCaptchaError('')
    setLoading(true)

    try {
      console.log('Mode:', mode)
      
      // Vérifications de base
      if (!email || !password) {
        throw new Error('Veuillez remplir tous les champs')
      }
      
      if (mode === 'signup') {
        if (!username) {
          throw new Error('Veuillez choisir un nom d\'utilisateur')
        }
        if (!firstName) {
          throw new Error('Veuillez entrer votre prénom')
        }
        if (!lastName) {
          throw new Error('Veuillez entrer votre nom')
        }
      }

      // Vérifier le CAPTCHA uniquement pour l'inscription
      if (mode === 'signup') {
        const expectedAnswer = captchaNum1 + captchaNum2
        const userAnswer = parseInt(captchaAnswer)
        console.log('Vérification CAPTCHA:', { expectedAnswer, userAnswer })
        
        if (isNaN(userAnswer) || userAnswer !== expectedAnswer) {
          setCaptchaError('Réponse incorrecte, veuillez réessayer')
          generateCaptcha()
          setLoading(false)
          return
        }
      }

      if (mode === 'login') {
        console.log('Tentative de connexion...')
        const { user, error } = await signIn(email, password)
        if (error) throw error
        console.log('Connexion réussie, redirection...', user)
        
        // Afficher un message de succès (utiliser setError pour les messages de succès aussi)
        setError('Connexion réussie! Redirection...')
        
        // Utiliser une redirection immédiate et directe
        console.log('🔄 Redirection immédiate vers la page d\'accueil...')
        
        // Forcer un rechargement complet pour garantir un état propre
        setTimeout(() => {
          console.log('🔄 Exécution de la redirection...')
          window.location.replace('/')
        }, 500)
      } else {
        console.log('Tentative d\'inscription...')
        const { user, error } = await signUp({ 
          email, 
          password, 
          username,
          firstName,
          lastName
        })
        
        if (error) {
          console.error('Erreur lors de l\'inscription:', error)
          throw error
        }
        
        console.log('Inscription réussie, utilisateur:', user)
        // Attendre un court instant avant de rediriger
        console.log('Attente de 1 seconde pour stabiliser la session...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Utiliser navigate au lieu de window.location.href pour une transition plus fluide
        navigate('/')
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Connexion' : 'Créer un compte'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Prénom
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
            
            {/* Champ CAPTCHA */}
            <div className="mt-4">
              <label htmlFor="captcha" className="block text-sm font-medium text-gray-700">
                Combien font {captchaNum1} + {captchaNum2} ?
              </label>
              <input
                id="captcha"
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
                disabled={loading}
              />
              {captchaError && (
                <p className="mt-1 text-sm text-red-600">{captchaError}</p>
              )}
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
            minLength={6}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {loading
              ? 'Chargement...'
              : mode === 'login'
              ? 'Se connecter'
              : 'Créer un compte'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-sm text-orange-600 hover:text-orange-800"
        >
          {mode === 'login'
            ? "Pas encore de compte ? S'inscrire"
            : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
