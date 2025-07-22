import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '../lib/firebase';
import { subscribeToBlogNotifications, unsubscribeFromBlogNotifications } from '../services/blogNotificationService';

interface UsePushNotificationsProps {
  userId: string;
}

export const usePushNotifications = ({ userId }: UsePushNotificationsProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Vérifier si les notifications sont supportées
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
    } else {
      setIsLoading(false);
      setError(new Error('Les notifications push ne sont pas supportées par votre navigateur.'));
    }
  }, []);

  // Vérifier l'état actuel des permissions
  const checkNotificationStatus = useCallback(async () => {
    if (!isSupported) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        
        if (token) {
          setFcmToken(token);
          setIsEnabled(true);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la vérification des notifications:', err);
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Activer les notifications
  const enableNotifications = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      setIsLoading(true);
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }

      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (!token) {
        throw new Error('Impossible de récupérer le token FCM');
      }

      const success = await subscribeToBlogNotifications(userId, token);
      if (success) {
        setFcmToken(token);
        setIsEnabled(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur lors de l\'activation des notifications:', err);
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  // Désactiver les notifications
  const disableNotifications = useCallback(async () => {
    if (!fcmToken) return false;
    
    try {
      setIsLoading(true);
      const success = await unsubscribeFromBlogNotifications(userId, fcmToken);
      
      if (success) {
        setFcmToken(null);
        setIsEnabled(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur lors de la désactivation des notifications:', err);
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fcmToken, userId]);

  // Basculer l'état des notifications
  const toggleNotifications = useCallback(async () => {
    if (isEnabled) {
      return await disableNotifications();
    } else {
      return await enableNotifications();
    }
  }, [isEnabled, enableNotifications, disableNotifications]);

  // Écouter les messages en temps réel
  useEffect(() => {
    if (!isEnabled) return;

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message reçu:', payload);
      // Vous pouvez ajouter ici la logique pour afficher les notifications
      // en fonction du type de notification (par exemple, nouvel article de blog)
    });

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);

  // Vérifier l'état initial
  useEffect(() => {
    if (isSupported) {
      checkNotificationStatus();
    }
  }, [isSupported, checkNotificationStatus]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    error,
    fcmToken,
    enableNotifications,
    disableNotifications,
    toggleNotifications,
  };
};
