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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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

  // Structure principale du layout : une seule racine <div>
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-white">
      {/* Header bleu foncé avec logo centré et arc inversé */}
      {isHeaderVisible && (
        <header className="site-header w-full flex flex-col items-center pt-8 pb-2 md:pt-10 md:pb-3 relative" style={{ background: '#10182a', marginTop: 0, borderTop: 'none', paddingTop: 32 }}>
          <img src="/logo.png" alt="Logo Popotte" className="h-28 md:h-32" style={{ maxHeight: 128 }} />
          {/* Arc inversé blanc en bas du header */}
          <div className="w-full overflow-hidden pointer-events-none" style={{height: 36, marginTop: -8}}>
            <svg viewBox="0 0 500 36" width="100%" height="36" preserveAspectRatio="none" style={{display: 'block'}}>
              <path d="M0,36 Q50,0 250,0 Q450,0 500,36 L500,36 L0,36 Z" fill="#fff"/>
            </svg>
          </div>
        </header>
      )}
      {/* Contenu principal */}
      <main className="w-full max-w-md mx-auto px-4 py-2 flex-grow pb-20 bg-white">
        <div className="w-full">
          {children}
        </div>
      </main>
      {/* Footer/navigation bas */}
      <div className="w-full max-w-md mx-auto border-0 border-none bg-white" style={{ border: 'none' }}>
        <BottomNavigation />
      </div>
      {/* Classe utilitaire pour titres bleu header */}
      <style>{`.text-header-blue { color: #10182a !important; }`}</style>
    </div>
  );
};

// Export par défaut pour compatibilité import
export default LayoutWithChildren;

