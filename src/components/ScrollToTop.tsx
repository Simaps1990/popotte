import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant qui positionne la page tout en haut à chaque changement de route
 * Ce composant ne rend rien visuellement, il a uniquement un effet de bord
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Utilisation de deux méthodes pour garantir que la page est positionnée tout en haut sans animation visible
    
    // Méthode 1: Positionnement immédiat sans animation (API moderne)
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto' // 'auto' est plus fiable que 'instant' pour un positionnement sans animation
      });
    } catch (e) {
      // Méthode 2: Fallback pour les navigateurs plus anciens
      window.scrollTo(0, 0);
    }
    
    // Méthode 3: S'assurer que le positionnement est appliqué avant le rendu
    // Utile pour les pages avec beaucoup de contenu
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // Pour Safari
    
    console.log(`📜 Page positionnée en haut après navigation vers: ${pathname}`);
  }, [pathname]);

  // Ce composant ne rend rien
  return null;
};

export default ScrollToTop;
