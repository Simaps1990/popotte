import React, { Suspense, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { loadApp } from './lib/initAuth'

// Déclaration du type pour window.__APP_LOADED__
declare global {
  interface Window {
    __APP_LOADED__?: boolean;
  }
}

// Variable pour stocker la racine React
let root: ReactDOM.Root | null = null;

// Composant de chargement
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-lg text-gray-700">Chargement de l'application...</p>
    </div>
  </div>
)

// Composant d'erreur
const ErrorFallback = ({ error }: { error: Error | null }) => (
  <div className="p-8 max-w-2xl mx-auto text-center">
    <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur lors du chargement</h1>
    <p className="text-gray-700 mb-6">
      {error?.message || 'Une erreur inattendue est survenue lors du démarrage de l\'application.'}
    </p>
    <button 
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Réessayer
    </button>
  </div>
)

// Fonction pour initialiser l'application
const initApp = async () => {
  // Vérifier si l'application est déjà chargée
  if (window.__APP_LOADED__) {
    console.warn('L\'application est déjà chargée')
    return
  }

  // Marquer l'application comme chargée
  window.__APP_LOADED__ = true

  // Récupérer l'élément racine
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error("Élément racine introuvable")
  }

  // Créer la racine React une seule fois
  if (!root) {
    root = ReactDOM.createRoot(rootElement)
  }

  // Fonction pour rendre l'application
  const renderApp = (app: React.ReactNode) => {
    if (!root) return
    
    root.render(
      <StrictMode>
        <Suspense fallback={<LoadingFallback />}>
          {app}
        </Suspense>
      </StrictMode>
    )
  }

  // Afficher le chargement immédiatement
  renderApp(<LoadingFallback />)

  try {
    // Charger les dépendances nécessaires
    await loadApp()
    
    // Rendre l'application principale
    renderApp(<App />)
  } catch (error) {
    console.error('Erreur critique lors de l\'initialisation:', error)
    
    // Afficher l'erreur à l'utilisateur
    renderApp(
      <ErrorFallback 
        error={error instanceof Error ? error : new Error('Erreur inconnue')} 
      />
    )
  }

  // Gestion des erreurs non capturées
  const handleError = (event: ErrorEvent) => {
    console.error('Erreur non capturée:', event.error)
  }

  // Gestion des promesses non gérées
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('Promesse rejetée non gérée:', event.reason)
  }

  // Ajouter les écouteurs d'événements
  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleRejection)

  // Nettoyage lors du rechargement à chaud
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    })
  }
}

// Démarrer l'application
initApp()