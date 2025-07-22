import { Link, useLocation } from 'react-router-dom'
import { Home, ClipboardList, CreditCard, Settings, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function BottomNavigation() {
  const location = useLocation()
  const { user } = useAuth()

  // Vérifie si le chemin actuel correspond au chemin de base ou à un sous-chemin
  const isActive = (path: string) => {
    // Pour la page d'accueil, vérifier l'exactitude
    if (path === '/' && location.pathname === '/') return true
    
    // Pour les autres pages, vérifier si le chemin actuel commence par le chemin de base
    // mais seulement si le chemin n'est pas la racine ('/')
    return path !== '/' && location.pathname.startsWith(path)
  }

  // Afficher la navigation même si l'utilisateur n'est pas connecté

  // Styles pour l'effet "creusé dans le bois"
  const woodIconStyle = (isActivePage: boolean) => ({
    filter: isActivePage 
      ? 'drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.7))' 
      : 'drop-shadow(1px 1px 1px rgba(245, 235, 220, 0.8))',
    color: isActivePage ? '#FFFFFF' : '#5D4037' // Blanc pour la page active, marron foncé sinon
  })
  
  const woodTextStyle = (isActivePage: boolean) => ({
    textShadow: isActivePage 
      ? '1px 1px 3px rgba(0, 0, 0, 0.7)' 
      : '1px 1px 1px rgba(245, 235, 220, 0.8)',
    color: isActivePage ? '#FFFFFF' : '#5D4037', // Blanc pour la page active, marron foncé sinon
    fontWeight: isActivePage ? 'bold' : 'normal' // Gras pour la page active
  })
  
  // Style pour le fond en bois
  const woodBackgroundStyle = {
    backgroundImage: 'url(/footer.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '100px', // Augmenté de 80px à 100px
    border: 'none' // Suppression de tous les bordures
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t-0" style={woodBackgroundStyle}>
      <div className="w-full max-w-md mx-auto px-2 h-full flex items-center">
        <div className="flex justify-around items-center w-full">
        <Link
          to="/"
          className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
        >
          <Home size={24} style={woodIconStyle(isActive('/'))} />
          <span className="text-xs mt-1" style={woodTextStyle(isActive('/'))}>Accueil</span>
        </Link>
        
        {user && (
          <Link
            to="/commande"
            className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
          >
            <ClipboardList size={24} style={woodIconStyle(isActive('/commande'))} />
            <span className="text-xs mt-1" style={woodTextStyle(isActive('/commande'))}>Commander</span>
          </Link>
        )}
        
        {user && (
          <>
            <Link
              to="/dettes"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
            >
              <CreditCard size={24} style={woodIconStyle(isActive('/dettes'))} />
              <span className="text-xs mt-1" style={woodTextStyle(isActive('/dettes'))}>Dettes</span>
            </Link>
            
            <Link
              to="/parametres"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
            >
              <Settings size={24} style={woodIconStyle(isActive('/parametres'))} />
              <span className="text-xs mt-1" style={woodTextStyle(isActive('/parametres'))}>Paramètres</span>
            </Link>
          </>
        )}

        {!user && (
          <Link
            to="/auth"
            className="flex flex-col items-center p-2 rounded-lg transition-colors"
            onClick={() => { console.log('Footer Connexion cliqué') }}
          >
            <Lock size={20} style={woodIconStyle(isActive('/auth'))} className="mb-1" />
            <span className="text-xs" style={woodTextStyle(isActive('/auth'))}>Connexion</span>
          </Link>
        )}
      </div>
    </div>
    </nav>
  )
}