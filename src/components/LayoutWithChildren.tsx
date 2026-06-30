import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from './BottomNavigation';

interface LayoutWithChildrenProps {
  children: ReactNode;
}

export const LayoutWithChildren: React.FC<LayoutWithChildrenProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-7 w-2/5" />
        <div className="skeleton h-48 w-full rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
        </div>
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page d'authentification
  // sauf si on est sur la page d'accueil ou une page d'auth
  const isAuthPage = window.location.pathname.startsWith('/auth');
  
  // Vérifier si une session est stockée localement pour éviter les redirections pendant la navigation
  const hasLocalSession = localStorage.getItem('supabase.auth.token') !== null;
  
  // Ne rediriger que si l'utilisateur n'est pas connecté ET qu'il n'y a pas de session locale
  if (!user && !hasLocalSession && !isAuthPage && window.location.pathname !== '/') {
    console.log('🚨 Redirection vers /auth car utilisateur non connecté et pas de session locale');
    return <Navigate to="/auth" replace />;
  }

  // Afficher le header (logo centré) sauf sur la page de login et callback
  const isHeaderVisible = !window.location.pathname.startsWith('/auth');
  const isHomePage = window.location.pathname === '/';

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden bg-white pt-4 md:pt-0"
      style={{ background: '#fff', paddingTop: isHomePage ? 0 : undefined }}
    >
      {isHomePage && (
        <>
          <header
            className="site-header w-full flex justify-center items-center pb-8 md:pb-10"
            style={{
              backgroundImage: "url('/fond.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              marginTop: 0,
              borderTop: 'none',
              paddingTop: 40,
              paddingBottom: 50,
              position: 'relative',
              boxShadow: 'none',
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 80,
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            {/* Header bleu foncé avec logo centré et gradient */}
            <img src="/logo.png" alt="Logo Popotte" className="h-28 md:h-32" style={{ maxHeight: 128, position: 'relative', zIndex: 3 }} />
            {/* Arrondi inversé en bas du header */}
            {/* Arrondis inversés très petits sur les extrémités */}
            <div style={{position: 'absolute', left: 0, right: 0, bottom: -1, height: 32, pointerEvents: 'none', zIndex: 2}}>
              <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" style={{display: 'block', width: '100%', height: 32}}>
                <path d="M0,32 Q6,0 18,0 L82,0 Q94,0 100,32 Z" fill="#fff" />
              </svg>
            </div>
          </header>
        </>
      )}
      <main className="w-full max-w-md mx-auto px-4 py-0 flex-grow pb-20 bg-white">
        <div key={location.pathname} className="w-full anim-fadeInUp">
          {children}
        </div>
      </main>
      <div className="w-full max-w-md mx-auto border-0 border-none pt-3" style={{ border: 'none' }}>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default LayoutWithChildren;
