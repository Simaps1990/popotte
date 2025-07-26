import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook personnalisé pour détecter et traiter les demandes de rechargement des données
 * À utiliser dans les composants de page pour recharger les données lorsque nécessaire
 * @param refreshCallback Fonction à appeler pour recharger les données
 */
export const useDataRefresh = (refreshCallback: () => void) => {
  const location = useLocation();
  const refreshedRef = useRef(false);
  
  useEffect(() => {
    // Vérifier si un rechargement des données est demandé
    const shouldRefresh = sessionStorage.getItem('forceDataRefresh') === 'true';
    const lastPath = sessionStorage.getItem('lastPath');
    
    // Si un rechargement est demandé et que nous sommes sur la bonne page
    if (shouldRefresh && lastPath === location.pathname && !refreshedRef.current) {
      console.log(`🔄 Rechargement des données détecté pour ${location.pathname}`);
      
      // Marquer comme traité pour éviter les rechargements multiples
      refreshedRef.current = true;
      
      // Nettoyer le flag de rechargement
      sessionStorage.removeItem('forceDataRefresh');
      
      // Appeler la fonction de rechargement
      refreshCallback();
    }
    
    // Réinitialiser le flag lorsque l'utilisateur quitte la page
    return () => {
      refreshedRef.current = false;
    };
  }, [location.pathname, refreshCallback]);
};
