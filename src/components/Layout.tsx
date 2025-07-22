import { Outlet, Navigate } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { useAuth } from '../contexts/AuthContext'

export function Layout() {
  const { user, loading } = useAuth()

  // Si le chargement est en cours, afficher un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page d'authentification
  // sauf si on est sur la page d'accueil
  if (!user && window.location.pathname !== '/') {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden p-0 m-0 bg-transparent">
      <main className="w-full max-w-md mx-auto px-4 pb-20 flex-grow pt-0 mt-0">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
      <div className="w-full max-w-md mx-auto">
        <BottomNavigation />
      </div>
    </div>
  )
}