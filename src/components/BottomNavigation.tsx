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

  // Styles épurés pour les icônes du footer
  const iconStyle = (isActivePage: boolean) => ({
    color: isActivePage ? '#10182a' : '#7b8690', // Bleu foncé pour actif, gris foncé sinon
    transition: 'color 0.2s',
  })
  const textStyle = (isActivePage: boolean) => ({
    color: isActivePage ? '#10182a' : '#cfd8dc',
    fontWeight: isActivePage ? 'bold' : 'normal',
    fontSize: '0.75rem',
    transition: 'color 0.2s',
  })
  // Footer blanc géré par CSS global (voir index.css)

  // Rendu conditionnel en fonction de la page
  if (isLoginPage) {
    // Footer spécial pour la page de login (mode "hors connexion" avec seulement deux icônes)
    return (
      <nav className="fixed bottom-0 left-0 right-0 border-t-0">
        <div className="w-full max-w-md mx-auto px-2 h-full flex items-center">
          <div className="flex justify-around items-center w-full">
            {/* Icône Accueil */}
            <Link
              to="/"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
              onClick={() => handleNavigationClick('/')}
            >
              <Home size={24} style={iconStyle(isActive('/'))} />
              <span className="text-xs mt-1" style={textStyle(isActive('/'))}>Accueil</span>
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
              <Lock size={20} style={iconStyle(isActive('/auth'))} className="mb-1" />
              <span className="text-xs" style={textStyle(isActive('/auth'))}>Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }
  
  // Footer normal pour les autres pages
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t-0">
      <div className="w-full max-w-md mx-auto px-2 h-full flex items-center">
        <div className="flex justify-around items-center w-full">
          {/* Icône Accueil (toujours visible) */}
          <Link
            to="/"
            className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
            onClick={() => handleNavigationClick('/')}
          >
            <Home size={24} style={iconStyle(isActive('/'))} />
            <span className="text-xs mt-1" style={textStyle(isActive('/'))}>Accueil</span>
          </Link>
          
          {/* Icônes visibles uniquement pour les utilisateurs connectés */}
          {user && (
            <Link
              to="/commande"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
              onClick={() => handleNavigationClick('/commande')}
            >
              <ClipboardList size={24} style={iconStyle(isActive('/commande'))} />
              <span className="text-xs mt-1" style={textStyle(isActive('/commande'))}>Commander</span>
            </Link>
          )}
          
          {user && (
            <>
              <Link
                to="/dettes"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
                onClick={() => handleNavigationClick('/dettes')}
              >
                <CreditCard size={24} style={iconStyle(isActive('/dettes'))} />
                <span className="text-xs mt-1" style={textStyle(isActive('/dettes'))}>Dettes</span>
              </Link>
              
              <Link
                to="/parametres"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors`}
                onClick={() => handleNavigationClick('/parametres')}
              >
                <Settings size={24} style={iconStyle(isActive('/parametres'))} />
                <span className="text-xs mt-1" style={textStyle(isActive('/parametres'))}>Paramètres</span>
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
              <Lock size={20} style={iconStyle(isActive('/auth'))} className="mb-1" />
              <span className="text-xs" style={textStyle(isActive('/auth'))}>Connexion</span>
            </Link>
          )}
      </div>
    </div>
    </nav>
  )
}