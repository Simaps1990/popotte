import { supabase } from '../lib/supabase';

interface NotificationPreferences {
  blog_notifications: boolean;
  user_id: string;
  notificationsAllowed?: boolean;
}

interface UserNotificationPreferences {
  blog_notifications: boolean;
  notificationsAllowed: boolean;
}

// Vérifier si les notifications sont supportées
export const isNotificationSupported = () => {
  return 'Notification' in window;
};

// Demander la permission des notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

// Vérifier si les notifications sont autorisées
export const checkNotificationPermission = (): boolean => {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
};

// Envoyer une notification
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!checkNotificationPermission()) return null;
  
  return new Notification(title, {
    icon: '/logo192.png', // Remplacez par le chemin de votre icône
    badge: '/logo192.png', // Pour les appareils mobiles
    ...options
  });
};

// Annuler l'abonnement aux notifications push
const revokePushSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Abonnement aux notifications push annulé');
    }
  } catch (error) {
    console.error('Erreur lors de l\'annulation de l\'abonnement aux notifications:', error);
  }
};

// Gérer les abonnements aux notifications de blog
export const toggleBlogNotifications = async (userId: string, enabled: boolean): Promise<boolean> => {
  try {
    if (enabled) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return false;
      
      // Enregistrer la préférence utilisateur
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { 
            user_id: userId, 
            blog_notifications: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
      return true;
    } else {
      // Désactiver les notifications et annuler l'abonnement
      await revokePushSubscription();
      
      // Mettre à jour les préférences utilisateur
      const { error } = await supabase
        .from('notification_preferences')
        .update({ 
          blog_notifications: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences de notification:', error);
    return false;
  }
};

// Vérifier les préférences de notification d'un utilisateur
export const getUserNotificationPreferences = async (userId: string): Promise<UserNotificationPreferences> => {
  try {
    // Vérifier d'abord si les notifications sont autorisées au niveau du navigateur
    const notificationsAllowed = checkNotificationPermission();
    
    // Récupérer les préférences de l'utilisateur
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('blog_notifications')
      .eq('user_id', userId)
      .single();

    // Si erreur ou pas de données, retourner désactivé
    if (error || !data) {
      return { 
        blog_notifications: false,
        notificationsAllowed
      };
    }
    
    // Vérifier si l'utilisateur est toujours abonné aux notifications push
    let isSubscribed = false;
    if (notificationsAllowed) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = subscription !== null;
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'abonnement:', error);
      }
    }
    
    // Si l'utilisateur n'est plus abonné, mettre à jour la base de données
    if (data.blog_notifications && !isSubscribed) {
      await supabase
        .from('notification_preferences')
        .update({ 
          blog_notifications: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      return { 
        blog_notifications: false,
        notificationsAllowed
      };
    }
    
    return { 
      blog_notifications: data.blog_notifications && isSubscribed,
      notificationsAllowed
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    return { 
      blog_notifications: false,
      notificationsAllowed: checkNotificationPermission()
    };
  }
};

// S'abonner aux notifications de blog
export const subscribeToBlogNotifications = async (userId: string, fcmToken: string): Promise<boolean> => {
  try {
    // Vérifier d'abord si les notifications sont autorisées
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;
    
    // Enregistrer le token FCM et activer les notifications de blog
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { 
          user_id: userId, 
          blog_notifications: true,
          fcm_token: fcmToken,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'abonnement aux notifications de blog:', error);
    return false;
  }
};

// Se désabonner des notifications de blog
export const unsubscribeFromBlogNotifications = async (userId: string, fcmToken: string): Promise<boolean> => {
  try {
    // Annuler l'abonnement push
    await revokePushSubscription();
    
    // Mettre à jour les préférences utilisateur
    const { error } = await supabase
      .from('notification_preferences')
      .update({ 
        blog_notifications: false,
        fcm_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('fcm_token', fcmToken);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur lors du désabonnement aux notifications de blog:', error);
    return false;
  }
};

// Envoyer une notification de nouvel article à tous les abonnés
export const notifyNewBlogPost = async (postTitle: string, postUrl: string) => {
  try {
    // Récupérer les utilisateurs qui ont activé les notifications
    const { data: subscribers, error } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('blog_notifications', true);

    if (error) throw error;
    if (!subscribers || subscribers.length === 0) return;

    // Envoyer une notification à chaque utilisateur
    // Note: En production, vous pourriez vouloir envoyer un email ou une notification in-app
    // au lieu d'une notification navigateur qui nécessite que l'utilisateur soit sur le site
    if (checkNotificationPermission()) {
      showNotification('Nouvel article publié !', {
        body: postTitle,
        data: { url: postUrl },
        requireInteraction: true
      });
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    return false;
  }
};
