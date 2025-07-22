import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthRouteProps } from '../../types/routing';

export const AuthRoute: React.FC<AuthRouteProps> = (props) => {
  const { children, requiredRole = 'user' } = props;
  const { user, isAdmin, loading } = useAuth();

  console.log('🔐 AuthRoute - État actuel:', {
    loading,
    user: user ? 'connecté' : 'non connecté',
    isAdmin,
    requiredRole,
    hasAccess: !loading && user && (requiredRole !== 'admin' || isAdmin)
  });

  if (loading) {
    console.log('🔄 AuthRoute - Chargement en cours...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!user) {
    console.log('🔒 AuthRoute - Utilisateur non connecté, redirection vers /auth');
    return <Navigate to="/auth" replace />;
  }

  // Vérifier les rôles si nécessaire
  if (requiredRole === 'admin' && !isAdmin) {
    console.log('🚫 AuthRoute - Accès refusé: rôle admin requis');
    return <Navigate to="/" replace />;
  }

  console.log('✅ AuthRoute - Accès autorisé');
  return <>{children}</>;
};

export default AuthRoute;
