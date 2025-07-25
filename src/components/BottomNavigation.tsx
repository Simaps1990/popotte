import { Link, useLocation } from 'react-router-dom'
import { Home, ClipboardList, CreditCard, Settings, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useForceReload } from '../hooks/useForceReload'
// Suppression de l'import qui cause les rechargements
// import { useCacheInvalidation } from '../hooks/useRealTimeSubscriptions'

export function BottomNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const { forceReload } = useForceReload()
  
  // Détecter si nous sommes sur la page de login
  const isLoginPage = location.pathname === '/auth'

  // Fonction pour gérer les clics de navigation avec rechargement des données
  const handleNavigationClick = (path: string) => {
    console.log(`🔄 Navigation vers ${path} - Avec rafraîchissement des données`);
    // Utiliser la nouvelle approche qui préserve la session
    forceReload(path);
  };

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

  // Rendu conditionnel en fonction de la page
  if (isLoginPage) {
    // Footer spécial pour la page de login (mode "hors connexion" avec seulement deux icônes)
    return (
      <nav className="fixed bottom-0 left-0 right-0 border-t-0" style={woodBackgroundStyle}>
        <div className="w-full max-w-md mx-auto px-2 h-full flex items-center">
          <div className="flex justify-around items-center w-full">
            {/* Icône Accueil */}
            <Link
              to="/"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
              onClick={() => handleNavigationClick('/')}
            >
              <Home size={24} style={woodIconStyle(isActive('/'))} />
              <span className="text-xs mt-1" style={woodTextStyle(isActive('/'))}>Accueil</span>
            </Link>
            
            {/* Icône Connexion */}
            <Link
              to="/auth"
              className="flex flex-col items-center p-2 rounded-lg transition-colors"
              onClick={() => { 
                console.log('Footer Connexion cliqué');
                handleNavigationClick('/auth');
              }}
            >
              <Lock size={20} style={woodIconStyle(isActive('/auth'))} className="mb-1" />
              <span className="text-xs" style={woodTextStyle(isActive('/auth'))}>Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }
  
  // Footer normal pour les autres pages
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t-0" style={woodBackgroundStyle}>
      <div className="w-full max-w-md mx-auto px-2 h-full flex items-center">
        <div className="flex justify-around items-center w-full">
          {/* Icône Accueil (toujours visible) */}
          <Link
            to="/"
            className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
            onClick={() => handleNavigationClick('/')}
          >
            <Home size={24} style={woodIconStyle(isActive('/'))} />
            <span className="text-xs mt-1" style={woodTextStyle(isActive('/'))}>Accueil</span>
          </Link>
          
          {/* Icônes visibles uniquement pour les utilisateurs connectés */}
          {user && (
            <Link
              to="/commande"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
              onClick={() => handleNavigationClick('/commande')}
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
                onClick={() => handleNavigationClick('/dettes')}
              >
                <CreditCard size={24} style={woodIconStyle(isActive('/dettes'))} />
                <span className="text-xs mt-1" style={woodTextStyle(isActive('/dettes'))}>Dettes</span>
              </Link>
              
              <Link
                to="/parametres"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
                onClick={() => handleNavigationClick('/parametres')}
              >
                <Settings size={24} style={woodIconStyle(isActive('/parametres'))} />
                <span className="text-xs mt-1" style={woodTextStyle(isActive('/parametres'))}>Paramètres</span>
              </Link>
            </>
          )}

          {/* Icône de connexion pour les utilisateurs non connectés (sauf sur la page de login) */}
          {!user && !isLoginPage && (
            <Link
              to="/auth"
              className="flex flex-col items-center p-2 rounded-lg transition-colors"
              onClick={() => { 
                console.log('Footer Connexion cliqué');
                handleNavigationClick('/auth');
              }}
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