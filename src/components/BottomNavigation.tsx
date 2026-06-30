import { Link, useLocation } from 'react-router-dom'
import { Home, ClipboardList, CreditCard, Settings, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useForceReload } from '../hooks/useForceReload'

export function BottomNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const { forceReload } = useForceReload()

  const isLoginPage = location.pathname === '/auth'

  const handleNavigationClick = (path: string) => {
    console.log(`🔄 Navigation vers ${path} - Avec rafraîchissement des données`)
    forceReload(path)
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (
      path === '/parametres' &&
      (location.pathname.startsWith('/parametres') ||
        location.pathname.startsWith('/admin') ||
        location.pathname === '/profil')
    ) {
      return true
    }
    return path !== '/' && location.pathname.startsWith(path)
  }

  const ic = (active: boolean) => ({
    color: active ? '#f2750a' : '#94a3b8',
    strokeWidth: active ? 2.2 : 1.8,
  })

  const labelCls = (active: boolean) =>
    `text-[11px] font-semibold mt-1 tracking-wide transition-colors duration-200 ${
      active ? 'text-orange-500' : 'text-slate-400'
    }`

  const dotCls = (active: boolean) =>
    `mt-0.5 h-1 w-1 rounded-full bg-orange-500 transition-all duration-200 ${
      active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
    }`

  const itemCls = 'tap-feedback flex flex-col items-center py-2 px-4 min-w-[56px]'

  if (isLoginPage) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 pb-4">
        <div className="w-full max-w-md mx-auto px-2 flex items-center justify-around">
          <Link to="/" className={itemCls} onClick={() => handleNavigationClick('/')}>
            <Home size={24} {...ic(isActive('/'))} />
            <span className={labelCls(isActive('/'))}>Accueil</span>
            <span className={dotCls(isActive('/'))} />
          </Link>

          <Link to="/auth" className={itemCls} onClick={() => handleNavigationClick('/auth')}>
            <Lock size={24} {...ic(isActive('/auth'))} />
            <span className={labelCls(isActive('/auth'))}>Connexion</span>
            <span className={dotCls(isActive('/auth'))} />
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-4">
      <div className="w-full max-w-md mx-auto px-2 flex items-center justify-around">
        <Link to="/" className={itemCls} onClick={() => handleNavigationClick('/')}>
          <Home size={24} {...ic(isActive('/'))} />
          <span className={labelCls(isActive('/'))}>Accueil</span>
          <span className={dotCls(isActive('/'))} />
        </Link>

        {user && (
          <Link to="/commande" className={itemCls} onClick={() => handleNavigationClick('/commande')}>
            <ClipboardList size={24} {...ic(isActive('/commande'))} />
            <span className={labelCls(isActive('/commande'))}>Commander</span>
            <span className={dotCls(isActive('/commande'))} />
          </Link>
        )}

        {user && (
          <Link to="/dettes" className={itemCls} onClick={() => handleNavigationClick('/dettes')}>
            <CreditCard size={24} {...ic(isActive('/dettes'))} />
            <span className={labelCls(isActive('/dettes'))}>Dettes</span>
            <span className={dotCls(isActive('/dettes'))} />
          </Link>
        )}

        {user && (
          <Link to="/parametres" className={itemCls} onClick={() => handleNavigationClick('/parametres')}>
            <Settings size={24} {...ic(isActive('/parametres'))} />
            <span className={labelCls(isActive('/parametres'))}>Paramètres</span>
            <span className={dotCls(isActive('/parametres'))} />
          </Link>
        )}

        {!user && !isLoginPage && (
          <Link
            to="/auth"
            className={itemCls}
            onClick={() => {
              console.log('Footer Connexion cliqué')
              handleNavigationClick('/auth')
            }}
          >
            <Lock size={24} {...ic(isActive('/auth'))} />
            <span className={labelCls(isActive('/auth'))}>Connexion</span>
            <span className={dotCls(isActive('/auth'))} />
          </Link>
        )}
      </div>
    </nav>
  )
}
