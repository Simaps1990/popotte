import { useState, useEffect } from 'react'
import { signIn, signUp } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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
  const [resetLoading, setResetLoading] = useState(false)
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
    setError('')
    setCaptchaError('')
    setLoading(true)

    try {
      
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

        
        if (isNaN(userAnswer) || userAnswer !== expectedAnswer) {
          setCaptchaError('Réponse incorrecte, veuillez réessayer')
          generateCaptcha()
          setLoading(false)
          return
        }
      }

      if (mode === 'login') {
        try {
          const startTime = Date.now()

          // Connexion standard via signIn (Supabase gère la persistance)
          const signInResult = await signIn(email, password)
          const { user, error } = signInResult
          const endTime = Date.now()

          if (error) {
            console.error('❌ ERREUR DE CONNEXION DÉTECTÉE:')
            console.error('  - Message:', error.message)
            console.error('  - Code:', (error as any).status)
            console.error('  - Détails:', error)
            throw error
          }

          if (!user) {
            console.error('❌ AUCUN UTILISATEUR RETOURNÉ MALGRÉ ABSENCE D\'ERREUR')
            throw new Error('Aucun utilisateur retourné par signIn')
          }

          setError('✅ Connexion réussie! Redirection en cours...')

          // Attendre un court délai pour que la session se stabilise
          await new Promise(resolve => setTimeout(resolve, 500))

          // Navigation normale vers la page d'accueil
          navigate('/', { replace: true })

          return

        } catch (loginError) {
          console.error('💥 === ERREUR CRITIQUE DANS LE PROCESSUS DE CONNEXION ===')
          console.error('  - Type:', typeof loginError)
          console.error('  - Message:', loginError instanceof Error ? loginError.message : 'Erreur inconnue')
          console.error('  - Stack:', loginError instanceof Error ? loginError.stack : 'Pas de stack')
          console.error('  - Objet complet:', loginError)
          console.error('=== FIN ERREUR CRITIQUE ===')
          throw loginError
        }
      } else {

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
        

        setError('Connexion réussie! Redirection en cours...')
        
        // Attendre un peu pour que la session soit bien établie
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Navigation normale vers la page d'accueil
        navigate('/', { replace: true })
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setCaptchaError('')

    if (!email) {
      setError('Veuillez entrer votre email pour recevoir le lien de réinitialisation')
      return
    }

    setResetLoading(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error

      setError("✅ Email envoyé ! Vérifiez votre boîte mail (et vos spams) pour réinitialiser votre mot de passe.")
    } catch (e) {
      console.error('Erreur reset password:', e)
      setError(e instanceof Error ? e.message : 'Impossible d\'envoyer l\'email de réinitialisation')
    } finally {
      setResetLoading(false)
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
          {/* Champs spécifiques à l'inscription */}
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
                  className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
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
                    className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
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
                    className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
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
                  className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  required
                  disabled={loading}
                />
                {captchaError && (
                  <p className="mt-1 text-sm text-red-600">{captchaError}</p>
                )}
              </div>
            </>
          )}
          {/* Champ email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
              required
            />
          </div>
          {/* Champ mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 px-4 py-2 mt-1 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
              required
              minLength={6}
            />
          </div>

          {mode === 'login' && (
            <div className="-mt-2 mb-2 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resetLoading}
                className="text-sm font-medium text-[#10182a] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Envoi en cours...' : 'Mot de passe oublié ?'}
              </button>
            </div>
          )}
          {/* Bouton principal bleu foncé */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-[#10182a] text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 transition mb-3"
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
        {/* Lien secondaire bleu foncé */}
        <button
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-[#10182a] text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 transition mb-3"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login'
            ? "Pas encore de compte ? S'inscrire"
            : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
