import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, CreditCard, Newspaper, Package, User, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getOrderStats, 
  getRecentOrders, 
  getProductStats,
  updateProfile as updateProfileService,
  changePassword as changePasswordService,
  getCurrentUserWithProfile
} from '../services/settingsService';
import { DebtSummaryPanel } from '../components/DebtSummaryPanel';
import { PendingDebtSummaryPanel } from '../components/PendingDebtSummaryPanel';
// importation supprimée : la logique de rafraîchissement manuel est désormais obsolète.
import '../styles/cards.css';

interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
}

interface ProductStat {
  id: string;
  name: string;
  stock_quantity: number;
  total_ordered: number;
  total_revenue: number;
  average_rating: number;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [currentAdminStatus, setCurrentAdminStatus] = useState(isAdmin);
  const [profile, setProfile] = useState<{first_name: string; last_name: string; phone: string | null} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'security'>('dashboard');
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error' | 'loading' | null, message: string}>({type: null, message: ''});
  
  // Référence pour éviter les rechargements multiples
  const refreshedRef = useRef(false);

  // Fonction pour charger les données utilisateur
  const loadUserData = async () => {
    try {
      setLoading(true);
      const { user, profile, error } = await getCurrentUserWithProfile();
      if (error) throw error;
      
      setUser(user);
      if (profile) {
        setProfile(profile);
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: user?.email || '',
          phone: profile.phone || ''
        });
      }
    } catch (err) {
      setError('Erreur lors du chargement du profil');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Utiliser le hook de rafraîchissement des données
  // Appel supprimé : la logique de rafraîchissement manuel est désormais obsolète.
  
  // Synchroniser l'état local avec le contexte Auth
  useEffect(() => {
    setCurrentAdminStatus(isAdmin);
  }, [isAdmin]);

  // Listener pour les changements de rôle admin en temps réel
  useEffect(() => {
    const handleAdminRoleChange = (event: CustomEvent) => {
      const { userId, newRole, isCurrentUser } = event.detail;
      
      if (isCurrentUser) {
        // Si c'est l'utilisateur courant, mettre à jour le statut immédiatement
        const newAdminStatus = newRole === 'admin';
        setCurrentAdminStatus(newAdminStatus);
        
        // Forcer un re-render en mettant à jour l'état
        setActiveTab(prev => prev); // Trigger re-render
      }
    };

    // Ajouter le listener d'événement
    window.addEventListener('adminRoleChanged', handleAdminRoleChange as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('adminRoleChanged', handleAdminRoleChange as EventListener);
    };
  }, []);

  // Chargement initial des données
  useEffect(() => {
    loadUserData();
  }, []);

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Gestion de la navigation
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Gestion des changements de formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Gestion de la soumission du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sauvegarde des valeurs actuelles pour restauration en cas d'erreur
    const previousFormData = { ...formData };
    
    try {
      setLoading(true);
      
      // Mise à jour optimiste de l'interface utilisateur
      setSaveStatus({ type: 'success', message: 'Profil mis à jour avec succès' });
      
      // Mise à jour optimiste du profil local
      if (profile) {
        setProfile({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone
        });
      }
      
      // Mise à jour du profil sur le serveur
      const updatedProfile = await updateProfileService({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone
      });
      
      // Rafraîchir les données utilisateur
      const { user: refreshedUser, profile: refreshedProfile } = await getCurrentUserWithProfile();
      if (refreshedUser && refreshedProfile) {
        setUser(refreshedUser);
        setProfile({
          first_name: refreshedProfile.first_name,
          last_name: refreshedProfile.last_name,
          phone: refreshedProfile.phone
        });
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Erreur lors de la mise à jour du profil' });
      console.error('Erreur de mise à jour du profil:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestion du changement de mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas' });
      return;
    }

    // Sauvegarde des valeurs actuelles pour restauration en cas d'erreur
    const previousPasswordData = { ...passwordData };
    
    try {
      setLoading(true);
      
      // Mise à jour optimiste de l'interface utilisateur
      setSaveStatus({ type: 'success', message: 'Mot de passe mis à jour avec succès' });
      
      // Réinitialiser le formulaire immédiatement pour une meilleure expérience utilisateur
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Appel au service de changement de mot de passe
      await changePasswordService(previousPasswordData.currentPassword, previousPasswordData.newPassword);
      
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Erreur lors du changement de mot de passe' });
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen pb-24 bg-white">
      <div className="space-y-6 max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-gray-900 anim-fadeInUp">Paramètres</h1>

        <div className="space-y-6">
          {currentAdminStatus && (
            <div className="anim-fadeInUp delay-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Comptabilité</h2>
              <DebtSummaryPanel className="mb-3" />
              <PendingDebtSummaryPanel className="mb-3" />
            </div>
          )}

          <div className="anim-fadeInUp delay-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Gestion du site</h2>
            <div className="space-y-2">

              {currentAdminStatus && (
                <>
                  <button onClick={() => navigateTo('/admin/users')} className="tap-feedback card hover:bg-blue-50 transition-colors cursor-pointer border-l-4 border-blue-500 text-left w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Gestion des pax</p>
                        <p className="text-sm text-gray-500">Gérer les comptes</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </button>

                  <button onClick={() => navigateTo('/admin/payments')} className="tap-feedback card hover:bg-orange-50 transition-colors cursor-pointer border-l-4 border-orange-500 text-left w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CreditCard size={20} className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Paiements à vérifier</p>
                        <p className="text-sm text-gray-500">Confirmer les paiements</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </button>

                  <button onClick={() => navigateTo('/admin/news')} className="tap-feedback card hover:bg-purple-50 transition-colors cursor-pointer border-l-4 border-purple-500 text-left w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Newspaper size={20} className="text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Gestion des news</p>
                        <p className="text-sm text-gray-500">Publier et modifier les articles</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </button>

                  <button onClick={() => navigateTo('/admin/products')} className="tap-feedback card hover:bg-orange-50 transition-colors cursor-pointer border-l-4 border-orange-500 text-left w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Gestion des produits</p>
                        <p className="text-sm text-gray-500">Gérer le menu et les prix</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </button>
                </>
              )}

              <button type="button" onClick={() => navigateTo('/profil')} className="tap-feedback card hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-gray-300 text-left w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Mon profil</p>
                    <p className="text-sm text-gray-500">Modifier mes informations</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </button>

              <button onClick={handleLogout} className="tap-feedback card hover:bg-red-50 transition-colors cursor-pointer border-l-4 border-red-400 text-left w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LogOut size={20} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700">Se déconnecter</p>
                    <p className="text-sm text-red-400">Quitter l'application</p>
                  </div>
                  <ChevronRight size={18} className="text-red-300" />
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
