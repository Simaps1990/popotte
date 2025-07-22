// Cache pour stocker l'état d'initialisation
let isInitialized = false

/**
 * Initialise l'application et charge les dépendances nécessaires
 */
export async function initializeApp(): Promise<{ success: boolean; error?: string }> {
  if (isInitialized) {
    return { success: true }
  }

  const errors: string[] = []
  
  try {
    console.log('🚀 Démarrage de l\'application...')
    
    // Désactivation de la création automatique d'utilisateurs de test
    console.log('🔒 Création automatique des utilisateurs de test désactivée')
    
    // Ici, vous pouvez ajouter d'autres initialisations si nécessaire
    // Par exemple :
    // - Configuration de services externes
    // - Vérification des permissions
    // - Chargement de données initiales
    
    if (errors.length > 0) {
      console.warn(`⚠️ L'application a démarré avec ${errors.length} avertissement(s)`)
      return { 
        success: true, // On considère que l'application peut fonctionner malgré les avertissements
        error: errors.join(' | ') 
      }
    }
    
    isInitialized = true
    console.log('🎉 Application initialisée avec succès')
    return { success: true }
    
  } catch (error) {
    const errorMessage = `Erreur critique lors de l'initialisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    console.error('❌', errorMessage)
    
    // En production, vous pourriez vouloir logger cette erreur dans un service externe
    if (!import.meta.env.DEV) {
      // Exemple: logToErrorTrackingService(error)
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

/**
 * Charge les dépendances nécessaires et initialise l'application
 */
export async function loadApp(): Promise<void> {
  try {
    const { success, error } = await initializeApp()
    
    if (!success) {
      const errorMessage = error || 'L\'application a démarré avec des avertissements'
      console.warn(errorMessage)
      throw new Error(errorMessage)
    }
    
    return
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du chargement'
    console.error('Erreur dans loadApp:', errorMessage)
    throw new Error(errorMessage)
  }
}
