import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Composant qui gère les événements de visibilité du document
 * pour éviter le rechargement de l'application et le spinner infini
 * lors du retour sur l'onglet/fenêtre
 */
const VisibilityHandler: React.FC = () => {
  // Accéder au contexte d'authentification pour gérer l'état de chargement
  const { loading, setLoadingState } = useAuth();
  
  // Référence pour suivre si une intervention a déjà eu lieu
  const hasIntervenedRef = useRef(false);
  
  // Fonction pour masquer le spinner de chargement et restaurer l'interface
// TEMPORAIREMENT DÉSACTIVÉE POUR PERMETTRE LE CHARGEMENT DES ACTUALITÉS
const hideLoadingSpinner = () => {
  console.log('⏸️ hideLoadingSpinner - DÉSACTIVÉ TEMPORAIREMENT pour permettre le chargement des actualités');
  
  // Ne plus interrompre les requêtes Supabase
  // Laisser les spinners faire leur travail normalement
  return false;
  
  // CODE ORIGINAL DÉSACTIVÉ :
  /*
  // Si on a déjà traité ce cycle de chargement, ne pas réintervenir
  if (hasIntervenedRef.current) return true;
  
  // Rechercher le spinner de chargement dans le DOM
  const spinnerElement = document.querySelector('.animate-spin');
  const loadingContainer = spinnerElement?.parentElement;
  
  // Si le spinner est trouvé, le masquer
  if (spinnerElement && loadingContainer) {
    console.log('🛑 Spinner de chargement détecté - Arrêt forcé');
    
    // Utiliser un cast pour résoudre l'erreur TypeScript
    (loadingContainer as HTMLElement).style.display = 'none';
    
    // Forçage de l'état de chargement à false dans le contexte Auth
    if (setLoadingState) {
      setLoadingState(false);
    }
    
    // Marquer que nous sommes intervenus
    hasIntervenedRef.current = true;
    
    // Réinitialiser le flag après un délai pour permettre de futures interventions
    setTimeout(() => {
      hasIntervenedRef.current = false;
    }, 2000);
    
    return true;
  }
  
  return false;
  */
};
  
  // Fonction pour restaurer l'interface utilisateur
  const restoreUI = () => {
    // Récupérer l'élément racine de l'application
    const rootElement = document.getElementById('root');
    
    if (rootElement) {
      // Rétablir l'affichage normal de l'application
      const appContent = rootElement.querySelector(':scope > div:not(#_rht_toaster)');
      if (appContent) {
        console.log('🔄 Restauration de l\'interface utilisateur');
        (appContent as HTMLElement).style.display = '';
      }
    }
  };
  
  // Fonction principale pour gérer le retour sur l'application
  const handleAppReturn = () => {
    console.log('🔄 Retour sur l\'application - Préservation de l\'état');
    
    // Arrêter immédiatement tout chargement en cours
    if (window.stop) {
      window.stop();
    }
    
    // Masquer le spinner de chargement s'il est présent
    hideLoadingSpinner();
    
    // Restaurer l'interface utilisateur
    restoreUI();
    
    // Vérifier à nouveau après un court délai
    setTimeout(() => {
      hideLoadingSpinner();
      restoreUI();
    }, 100);
    
    // Et une dernière vérification après un délai plus long
    setTimeout(() => {
      hideLoadingSpinner();
      restoreUI();
    }, 500);
  };
  
  // Effet pour gérer les changements de visibilité du document
  useEffect(() => {
    let wasVisible = true;
    
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (!wasVisible && isVisible) {
        // L'utilisateur revient sur l'application après l'avoir quittée
        handleAppReturn();
      }
      
      // Mettre à jour l'état de visibilité
      wasVisible = isVisible;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Effet pour gérer le focus de la fenêtre
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Fenêtre a reçu le focus');
      handleAppReturn();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Effet pour gérer l'événement pageshow
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // Si la page est chargée depuis le cache (retour avec bouton précédent)
      if (event.persisted) {
        console.log('🔄 Page restaurée depuis le cache');
        handleAppReturn();
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);
  
  // Effet pour forcer l'arrêt du chargement après un délai SEULEMENT si nécessaire
  useEffect(() => {
    // Si l'application est en chargement pendant plus de 8 secondes, intervenir
    // Délai augmenté pour permettre le chargement normal des news
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('⏱️ Délai de chargement dépassé - Intervention forcée');
        hideLoadingSpinner();
        restoreUI();
      }
    }, 8000); // Augmenté à 8 secondes
    
    return () => clearTimeout(timeoutId);
  }, [loading]);
  
  // Ce composant ne rend rien visuellement
  return null;
};

export default VisibilityHandler;
