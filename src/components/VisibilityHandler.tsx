import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Composant qui gère les événements de visibilité du document
 * pour éviter le rechargement de l'application et le spinner infini
 * lors du retour sur l'onglet/fenêtre
 */
const VisibilityHandler: React.FC = () => {
  // Accéder au contexte d'authentification pour gérer l'état de chargement
  const { loading, setLoadingState } = useAuth();
  
  // Fonction pour masquer le spinner de chargement
  const hideLoadingSpinner = () => {
    // Rechercher le spinner de chargement dans le DOM
    const spinnerElement = document.querySelector('.animate-spin');
    const loadingContainer = spinnerElement?.parentElement;
    
    // Si le spinner est trouvé, le masquer
    if (spinnerElement && loadingContainer) {
      console.log('🔄 Spinner de chargement détecté - Masquage forcé');
      // Utiliser un cast pour résoudre l'erreur TypeScript
      (loadingContainer as HTMLElement).style.display = 'none';
      
      // Forçage de l'état de chargement à false dans le contexte Auth
      if (setLoadingState && loading) {
        setLoadingState(false);
      }
      
      return true;
    }
    
    return false;
  };
  
  useEffect(() => {
    // Variable pour suivre si l'application était visible auparavant
    let wasVisible = true;
    
    // Fonction pour gérer les changements de visibilité
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (!wasVisible && isVisible) {
        // L'utilisateur revient sur l'application après l'avoir quittée
        console.log('🔄 Retour sur l\'application - Préservation de l\'état');
        
        // Arrêter tout chargement en cours
        if (window.stop) {
          window.stop();
        }
        
        // Masquer le spinner de chargement s'il est présent
        hideLoadingSpinner();
        
        // Réactiver les éléments d'interface utilisateur
        setTimeout(() => {
          // Récupérer l'élément racine de l'application
          const rootElement = document.getElementById('root');
          
          if (rootElement) {
            // Rétablir l'affichage normal de l'application
            const appContent = rootElement.querySelector(':scope > div:not(#_rht_toaster)');
            if (appContent) {
              // Utiliser un cast pour résoudre l'erreur TypeScript
              (appContent as HTMLElement).style.display = '';
            }
          }
          
          // Vérifier à nouveau si le spinner est toujours visible
          hideLoadingSpinner();
        }, 100);
      }
      
      // Mettre à jour l'état de visibilité
      wasVisible = isVisible;
    };
    
    // Ajouter l'écouteur d'événements de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Nettoyer l'écouteur lors du démontage du composant
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading]);
  
  // Ajouter un gestionnaire pour l'événement 'focus' de la fenêtre
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Fenêtre a reçu le focus - Préservation de l\'état');
      
      // Empêcher tout rechargement potentiel
      if (window.stop) {
        window.stop();
      }
      
      // Masquer le spinner de chargement s'il est présent
      hideLoadingSpinner();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loading]);
  
  // Ajouter un gestionnaire pour l'événement 'pageshow'
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // Si la page est chargée depuis le cache (retour avec bouton précédent)
      if (event.persisted) {
        console.log('🔄 Page restaurée depuis le cache - Préservation de l\'état');
        
        // Empêcher tout rechargement potentiel
        if (window.stop) {
          window.stop();
        }
        
        // Masquer le spinner de chargement s'il est présent
        hideLoadingSpinner();
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [loading]);
  
  // Ce composant ne rend rien visuellement
  return null;
};

export default VisibilityHandler;
