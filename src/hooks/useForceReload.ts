import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook personnalisé pour forcer le rechargement des pages lors de la navigation
 * Permet de s'assurer que les données sont toujours à jour
 */
export const useForceReload = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Force le rechargement de la page actuelle ou d'une page cible
   * @param path Chemin de la page à recharger (optionnel, utilise la page actuelle si non spécifié)
   */
  const forceReload = (path?: string) => {
    const targetPath = path || location.pathname;
    
    console.log(`🔄 Rechargement forcé de la page: ${targetPath}`);
    
    // Si on est déjà sur la page cible, forcer le rechargement complet
    if (location.pathname === targetPath) {
      console.log(`🔄 Déjà sur ${targetPath} - Rechargement complet de la page`);
      window.location.href = targetPath;
      return;
    }
    
    // Sinon, naviguer vers la page avec React Router puis forcer le rechargement
    navigate(targetPath, { replace: true });
    setTimeout(() => {
      if (window.location.pathname === targetPath) {
        console.log(`🔄 Rechargement forcé après navigation vers ${targetPath}`);
        window.location.reload();
      }
    }, 100);
  };

  return { forceReload };
};
