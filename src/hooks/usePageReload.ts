import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour forcer le rechargement des données à chaque visite de page
 * Retourne un timestamp qui change à chaque fois que la page est visitée
 */
export function usePageReload() {
  const [lastVisit, setLastVisit] = useState(Date.now());
  
  useEffect(() => {
    // Mettre à jour le timestamp à chaque montage du composant
    setLastVisit(Date.now());
    
    // Fonction pour gérer la visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setLastVisit(Date.now());
      }
    };
    
    // Ajouter les écouteurs d'événements
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => setLastVisit(Date.now()));
    
    // Nettoyer les écouteurs
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => setLastVisit(Date.now()));
    };
  }, []);
  
  return lastVisit;
}
