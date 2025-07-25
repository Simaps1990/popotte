// FIX RADICAL pour la redirection après connexion
// À ajouter dans votre AuthContext.tsx ou composant de connexion

// Dans votre fonction de connexion, après succès :
const handleSuccessfulLogin = (user) => {
  console.log('🔓 Connexion réussie, redirection forcée...');
  
  // Forcer la redirection immédiatement
  if (user.role === 'admin') {
    window.location.href = '/admin';
  } else {
    window.location.href = '/';
  }
  
  // Alternative avec React Router (si window.location ne marche pas)
  // navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
};

// Ou encore plus radical - dans votre page de connexion :
// Après connexion réussie, ajoutez :
setTimeout(() => {
  window.location.reload();
}, 100);
