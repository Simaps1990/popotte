import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from './BottomNavigation';

interface LayoutWithChildrenProps {
  children: ReactNode;
}

export const LayoutWithChildren: React.FC<LayoutWithChildrenProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Si le chargement est en cours, afficher un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
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

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-white" style={{ background: '#fff' }}>
      {window.location.pathname === '/' && (
        <>
          <div style={{background: '#10182a', width: '100%', height: 40, position: 'relative', zIndex: 1}}></div>
          <header className="site-header w-full flex justify-center items-center pb-8 md:pb-10" style={{ background: '#10182a', marginTop: 0, borderTop: 'none', paddingTop: 0, paddingBottom: 40, position: 'relative', boxShadow: 'none', zIndex: 2 }}>
            {/* Header bleu foncé avec logo centré */}
            <img src="/logo.png" alt="Logo Popotte" className="h-28 md:h-32" style={{ maxHeight: 128 }} />
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
      <main className="w-full max-w-md mx-auto px-4 py-2 flex-grow pb-20 bg-white">
        <div className="w-full">
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
