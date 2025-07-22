import { initializeApp, FirebaseApp, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Configuration Firebase - À remplacer par vos propres informations
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialiser Firebase
let app: FirebaseApp;
let messaging: Messaging;

try {
  app = getApp();
  messaging = getMessaging(app);
} catch (e) {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

// Demander la permission de notification
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

// Obtenir le token FCM
export const getFcmToken = async (vapidKey: string) => {
  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('Aucun jeton d\'inscription disponible. Demande de permission...');
      const permission = await requestNotificationPermission();
      if (permission) {
        return await getToken(messaging, { vapidKey });
      }
    }
  } catch (error) {
    console.error('Une erreur s\'est produite lors de la récupération du jeton', error);
    return null;
  }
};

// Écouter les messages en arrière-plan
export const onMessageListener = () =>
  new Promise<{ notification: { title: string; body: string } }>((resolve) => {
    onMessage(messaging, (payload) => {
      if (payload.notification) {
        resolve({
          notification: {
            title: payload.notification.title || 'Nouvelle notification',
            body: payload.notification.body || '',
          },
        });
      }
    });
  });

export { messaging };

export default app;
