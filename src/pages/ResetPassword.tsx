import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const code = params.get('code')
  const type = params.get('type')

  const hasRecoveryParams = useMemo(() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const sp = new URLSearchParams(search)

    return (
      (sp.get('type') === 'recovery' && !!sp.get('code')) ||
      sp.get('type') === 'recovery' ||
      !!sp.get('code') ||
      hash.includes('type=recovery') ||
      hash.includes('access_token=')
    )
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const { data: initialSessionData } = await supabase.auth.getSession()
        if (!cancelled && initialSessionData.session) {
          setReady(true)
          return
        }

        if (code && (!type || type === 'recovery')) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            if (!cancelled) {
              setStatus(error.message)
              setReady(true)
            }
            return
          }

          window.history.replaceState({}, '', '/reset-password')
        }

        if (!hasRecoveryParams) {
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            setStatus('Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.')
          }
          setReady(true)
          return
        }

        const { data: authSubscription } = supabase.auth.onAuthStateChange((
          _event: AuthChangeEvent,
          session: Session | null
        ) => {
          if (cancelled) return
          if (session) {
            setReady(true)
          }
        })

        const startedAt = Date.now()
        const timeoutMs = 5000
        while (!cancelled && Date.now() - startedAt < timeoutMs) {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            setReady(true)
            authSubscription.subscription.unsubscribe()
            return
          }
          await new Promise((r) => setTimeout(r, 250))
        }

        authSubscription.subscription.unsubscribe()

        if (!cancelled) {
          setStatus('Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.')
          setReady(true)
        }
      } catch (e) {
        console.error('Erreur init reset password:', e)
        if (!cancelled) {
          setStatus(e instanceof Error ? e.message : 'Erreur lors de la préparation de la réinitialisation')
          setReady(true)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [code, type, hasRecoveryParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)

    if (!password || !confirmPassword) {
      setStatus('Veuillez remplir les deux champs')
      return
    }

    if (password.length < 6) {
      setStatus('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (password !== confirmPassword) {
      setStatus('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) {
        setStatus('Session manquante. Veuillez rouvrir le lien de réinitialisation depuis votre email.')
        return
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setStatus('✅ Mot de passe mis à jour. Vous pouvez vous connecter.')
      setTimeout(() => {
        navigate('/auth', { replace: true })
      }, 1200)
    } catch (e) {
      console.error('Erreur updateUser(password):', e)
      setStatus(e instanceof Error ? e.message : 'Erreur lors de la mise à jour du mot de passe')
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = !!status && status.startsWith('✅')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Nouveau mot de passe
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 rounded-2xl sm:px-10 border border-gray-100 shadow-sm">
          {status && (
            <div className={`mb-4 p-3 rounded ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
              {status}
            </div>
          )}

          {!ready ? (
            <div className="text-center py-6 text-gray-600">Chargement...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2 mt-1 mb-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10182a]/20 focus:border-[#10182a] transition"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2 mt-1 mb-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10182a]/20 focus:border-[#10182a] transition"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold bg-[#10182a] text-white hover:bg-[#0b1020] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10182a]/30 transition"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/auth', { replace: true })}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-[#10182a] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10182a]/20 transition"
              >
                Retour à la connexion
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
