import { Outlet, Navigate } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { useAuth } from '../contexts/AuthContext'

export function Layout() {
  const { user, loading } = useAuth()

  // Si le chargement est en cours, afficher un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white"> // Charte graphique : fond blanc partout sauf header
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
    <div className="min-h-screen flex flex-col overflow-x-hidden p-0 m-0 bg-white"> // Charte graphique : fond blanc partout sauf header
      <main className="w-full max-w-md mx-auto px-4 pb-20 flex-grow pt-0 mt-0 bg-white border border-[#eee] rounded"> // Charte graphique : containers : fond blanc, bordure claire
        <div className="w-full bg-white p-4 border border-[#eee] rounded"> // Charte graphique : containers : fond blanc, bordure claire
          <Outlet />
        </div>
      </main>
      <div className="w-full max-w-md mx-auto bg-white pt-8 pb-8 border-t border-[#eee] flex flex-col items-center justify-center space-y-2"> // Charte graphique : footer blanc, marge haute, padding augmenté, cohérent partout
        <BottomNavigation />
      </div>
    </div>
  )
}