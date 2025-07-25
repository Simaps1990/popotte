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
        try {
          console.log('🚀 === DÉBUT PROCESSUS DE CONNEXION AVEC LOGGING EXTENSIF ===')
          console.log('📧 Email:', email)
          console.log('🔐 Password présent:', !!password)
          console.log('⏰ Timestamp:', new Date().toISOString())
          
          // Vérifier l'état avant connexion
          console.log('🔍 État avant connexion:')
          console.log('  - URL actuelle:', window.location.href)
          console.log('  - User agent:', navigator.userAgent)
          console.log('  - Local storage keys:', Object.keys(localStorage))
          
          console.log('🔑 Appel de signIn...')
          const startTime = Date.now()
          
          // TIMEOUT D'URGENCE - REDIRECTION FORCÉE SI SIGNIN BLOQUE
          console.log('🚑 Démarrage timeout d\'urgence de 5s pour redirection forcée')
          const emergencyRedirect = setTimeout(() => {
            console.log('🚨 TIMEOUT SIGNIN - REDIRECTION D\'URGENCE ACTIVÉE !')
            console.log('🚨 signIn bloqué depuis 5s, redirection brutale...')
            
            // Vérifier si Supabase dit qu'on est connecté
            supabase.auth.getSession().then(({ data }: { data: any }) => {
              console.log('🚨 Session d\'urgence:', data.session ? 'active' : 'inactive')
              if (data.session) {
                console.log('🚨 SESSION ACTIVE DÉTECTÉE - REDIRECTION BRUTALE IMMÉDIATE')
                window.location.href = '/'
              } else {
                console.log('🚨 Pas de session active, mais redirection quand même...')
                // Redirection de sécurité même sans session
                setTimeout(() => window.location.href = '/', 1000)
              }
            })
          }, 5000)
          
          let signInResult
          try {
            signInResult = await signIn(email, password)
            clearTimeout(emergencyRedirect) // Annuler le timeout si signIn répond
          } catch (signInError) {
            clearTimeout(emergencyRedirect)
            throw signInError
          }
          
          const { user, error } = signInResult
          const endTime = Date.now()
          
          console.log(`⏱️ signIn terminé en ${endTime - startTime}ms`)
          console.log('📊 Résultat signIn:', {
            user: user ? {
              id: user.id,
              email: user.email,
              role: user.role
            } : null,
            error: error ? {
              message: error.message,
              status: (error as any).status || 'N/A',
              statusText: (error as any).statusText || 'N/A'
            } : null
          })
          
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
          
          console.log('✅ CONNEXION RÉUSSIE - ANALYSE DE L\'UTILISATEUR:')
          console.log('  - ID utilisateur:', user.id)
          console.log('  - Email:', user.email)
          console.log('  - Rôle:', user.role)
          console.log('  - Métadonnées:', user.user_metadata)
          
          // Vérifier l'état de la session
          console.log('🔍 Vérification session après connexion...')
          const { data: sessionData } = await supabase.auth.getSession()
          console.log('📊 Session actuelle:', {
            session: sessionData.session ? {
              user_id: sessionData.session.user.id,
              expires_at: sessionData.session.expires_at,
              access_token: sessionData.session.access_token ? 'présent' : 'absent'
            } : null
          })
          
          setError('✅ Connexion réussie! Redirection en cours...')
          
          console.log('🔄 === DÉBUT PROCESSUS DE REDIRECTION ===')
          console.log('  - État loading avant redirection:', loading)
          console.log('  - URL cible: /')
          
          // Attendre un court délai pour que la session se stabilise
          console.log('⏳ Attente 500ms pour stabilisation session...')
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Vérifier à nouveau la session
          const { data: sessionData2 } = await supabase.auth.getSession()
          console.log('📊 Session après attente:', {
            session: sessionData2.session ? 'active' : 'inactive',
            user_id: sessionData2.session?.user?.id
          })
          
          console.log('🚀 REDIRECTION MULTIPLE POUR GARANTIR LE SUCCÈS:')
          
          // Méthode 1: React Router navigate
          console.log('  1. Tentative navigate("/")')
          navigate('/')
          
          // Méthode 2: window.location.href (après délai)
          console.log('  2. Programmation window.location.href après 100ms')
          setTimeout(() => {
            console.log('  2. Exécution window.location.href = "/"')
            window.location.href = '/'
          }, 100)
          
          // Méthode 3: window.location.replace (après délai plus long)
          console.log('  3. Programmation window.location.replace après 200ms')
          setTimeout(() => {
            console.log('  3. Exécution window.location.replace("/")')
            window.location.replace('/')
          }, 200)
          
          // MÉTHODE 4: REDIRECTION BRUTALE IMMÉDIATE (NOUVEAU)
          console.log('  4. 🔥 REDIRECTION BRUTALE IMMÉDIATE - AUCUNE ÉCHAPPATOIRE !')
          console.log('  4. 🔥 Current pathname:', window.location.pathname)
          
          // Forcer immédiatement
          if (window.location.pathname === '/auth') {
            console.log('  4. 🔥 FORCE IMMÉDIATE: window.location.href = "/"')
            window.location.href = '/'
          }
          
          // Vérification forcée toutes les 50ms pendant 2 secondes
          let attempts = 0
          const forceRedirect = setInterval(() => {
            attempts++
            console.log(`  4. 🔥 VÉRIFICATION FORCÉE #${attempts} - pathname:`, window.location.pathname)
            
            if (window.location.pathname === '/auth') {
              console.log(`  4. 🔥 TENTATIVE FORCÉE #${attempts}: window.location.href = "/"`)
              window.location.href = '/'
            } else {
              console.log(`  4. ✅ REDIRECTION RÉUSSIE après ${attempts} tentatives !`)
              clearInterval(forceRedirect)
            }
            
            // Arrêter après 40 tentatives (2 secondes)
            if (attempts >= 40) {
              console.log('  4. 💥 ÉCHEC TOTAL - REDIRECTION IMPOSSIBLE APRÈS 40 TENTATIVES')
              clearInterval(forceRedirect)
            }
          }, 50)
          
          console.log('🏁 === FIN PROCESSUS DE CONNEXION ===')
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
        setError('Connexion réussie! Redirection en cours...')
        
        // Attendre un peu pour que la session soit bien établie
        console.log('Attente de 1 seconde pour stabiliser la session...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // SOLUTION RADICALE: Forcer le rechargement de la page
        console.log('🔄 Redirection forcée avec rechargement...')
        window.location.href = '/'
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
