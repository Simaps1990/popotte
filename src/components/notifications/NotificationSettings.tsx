import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { 
  isNotificationSupported,
  getUserNotificationPreferences,
  toggleBlogNotifications
} from '../../services/blogNotificationService';

interface NotificationSettingsProps {
  userId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = isNotificationSupported();

  // Charger les préférences de l'utilisateur
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getUserNotificationPreferences(userId);
        setIsEnabled(prefs.blog_notifications);
        setNotificationsAllowed(prefs.notificationsAllowed);
      } catch (err) {
        console.error('Erreur lors du chargement des préférences:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      } finally {
        setIsLoading(false);
      }
    };

    if (isSupported) {
      loadPreferences();
    } else {
      setIsLoading(false);
    }
  }, [userId, isSupported]);

  const handleToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      const success = await toggleBlogNotifications(userId, enabled);
      if (success) {
        setIsEnabled(enabled);
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des préférences:', err);
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
        <p>Les notifications ne sont pas supportées par votre navigateur.</p>
      </div>
    );
  }
  
  if (!notificationsAllowed && isEnabled) {
    // Si les notifications ne sont pas autorisées mais que l'utilisateur pense qu'elles le sont,
    // on met à jour l'état pour refléter la réalité
    setIsEnabled(false);
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p>Erreur: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications des articles de blog</h3>
        <p className="text-sm text-gray-500 mt-1">
          Recevez une notification à chaque nouvel article publié
        </p>
      </div>
      
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Alertes d'articles
              </h4>
              <p className="text-sm text-gray-500">
                {isEnabled 
                  ? 'Activées - Vous serez notifié des nouveaux articles' 
                  : notificationsAllowed 
                    ? 'Désactivées - Activez pour être notifié des nouveaux articles'
                    : 'Les notifications sont désactivées dans votre navigateur'}
              </p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={isLoading || !notificationsAllowed}
            />
            <div className={`w-11 h-6 rounded-full peer ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isEnabled ? 'after:translate-x-5' : ''} ${!notificationsAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}>
            </div>
          </label>
        </div>

        {!notificationsAllowed ? (
          <div className="mt-3 p-3 bg-yellow-50 rounded-md text-sm text-yellow-700">
            <p>Les notifications sont actuellement désactivées dans votre navigateur. Veuillez autoriser les notifications pour ce site dans les paramètres de votre navigateur.</p>
          </div>
        ) : !isEnabled ? (
          <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
            <p>Activez les notifications pour être informé immédiatement lors de la publication de nouveaux articles.</p>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-green-50 rounded-md text-sm text-green-700">
            <p>Vous recevrez une notification à chaque nouvel article publié sur le blog.</p>
            <button 
              onClick={() => handleToggle(false)}
              className="mt-2 text-sm text-green-700 underline hover:text-green-800"
              disabled={isLoading}
            >
              Désactiver les notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
