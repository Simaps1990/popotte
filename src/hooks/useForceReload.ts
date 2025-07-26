import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook personnalisé pour forcer le rechargement des données sans perturber la session
 * Utilise une approche qui préserve la session Supabase tout en rafraîchissant les données
 */
export const useForceReload = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Vérifie si la session Supabase est active
   * @returns Promise<boolean> true si la session est active
   */
  const checkSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    } catch (error) {
      console.error('Erreur lors de la vérification de la session:', error);
      return false;
    }
  }, []);

  /**
   * Force le rechargement des données sans perturber la session
   * @param path Chemin de la page à recharger (optionnel, utilise la page actuelle si non spécifié)
   */
  const forceReload = useCallback(async (path?: string) => {
    const targetPath = path || location.pathname;
    
    console.log(`🔄 Navigation avec rafraîchissement vers: ${targetPath}`);
    
    // Vérifier si la session est active avant de naviguer
    const hasSession = await checkSession();
    console.log(`🔑 État de la session avant navigation: ${hasSession ? 'Connecté' : 'Non connecté'}`);
    
    // Stocker un flag dans sessionStorage pour indiquer qu'un rechargement est nécessaire
    sessionStorage.setItem('forceDataRefresh', 'true');
    sessionStorage.setItem('lastPath', targetPath);
    
    // Si on est déjà sur la page cible, simuler une navigation
    if (location.pathname === targetPath) {
      console.log(`🔄 Déjà sur ${targetPath} - Rafraîchissement des données sans rechargement complet`);
      // Utiliser replace pour éviter d'ajouter des entrées dans l'historique
      navigate('/', { replace: true });
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 50);
      return;
    }
    
    // Sinon, naviguer normalement vers la page cible
    navigate(targetPath, { replace: true });
  }, [location.pathname, navigate, checkSession]);

  return { forceReload };
};
