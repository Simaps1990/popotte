import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  // Conteneur principal avec fond blanc partout sauf header
  return (
    <div className="w-full min-h-screen pb-20 relative bg-white" style={{ background: '#fff' }}>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#10182a' }}>Paramètres</h1>
        </div>


          <div className="space-y-4">
            
            {/* Statistiques financières - visible pour tous les utilisateurs */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#10182a' }}>Statistiques financières</h2>
              <DebtSummaryPanel className="mb-4" />
              <PendingDebtSummaryPanel className="mb-4" />
            </div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#10182a' }}>Gestion du site</h2>

            <div className="grid grid-cols-1 gap-4">
              {/* Boutons d'administration - visibles uniquement pour les administrateurs */}
              {isAdmin && (
                <>
                  <button 
                    onClick={() => navigateTo('/admin/users')}
                    className="card hover:bg-blue-100 transition-colors cursor-pointer border-l-4 border-blue-500 text-left w-full bg-white"
                  >
                    <div className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center" style={{ border: '1px solid #10182a' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: '#10182a' }}>Gestion des utilisateurs</h3>
                        <p className="text-sm" style={{ color: '#10182a' }}>Gérer les comptes et permissions</p>
                      </div>
                      <span className="text-blue-400">→</span>
                    </div>
                  </button>

                  {/* Bouton Paiements à vérifier */}
                  <button 
                    onClick={() => navigateTo('/admin/payments')}
                    className="card hover:bg-orange-100 transition-colors cursor-pointer border-l-4 border-orange-500 text-left w-full bg-white"
                  >
                    <div className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center" style={{ border: '1px solid #10182a' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                          <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                          <line x1="2" x2="22" y1="10" y2="10"></line>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: '#10182a' }}>Paiements à vérifier</h3>
                        <p className="text-sm" style={{ color: '#10182a' }}>Confirmer les paiements notifiés</p>
                      </div>
                      <span className="text-orange-400">→</span>
                    </div>
                  </button>

                  {/* Bouton Gestion des actualités */}
                  <button 
                    onClick={() => navigateTo('/admin/news')}
                    className="card hover:bg-purple-100 transition-colors cursor-pointer border-l-4 border-purple-500 text-left w-full bg-white"
                  >
                    <div className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center" style={{ border: '1px solid #10182a' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" x2="8" y1="13" y2="13"></line>
                          <line x1="16" x2="8" y1="17" y2="17"></line>
                          <line x1="10" x2="8" y1="9" y2="9"></line>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: '#10182a' }}>Gestion des actualités</h3>
                        <p className="text-sm" style={{ color: '#10182a' }}>Publier et modifier les articles</p>
                      </div>
                      <span className="text-purple-400">→</span>
                    </div>
                  </button>

                  {/* Bouton Gestion des produits */}
                  <button 
                    onClick={() => navigateTo('/admin/products')}
                    className="card hover:bg-orange-100 transition-colors cursor-pointer border-l-4 border-orange-500 text-left w-full bg-white"
                  >
                    <div className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center" style={{ border: '1px solid #10182a' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                          <path d="M16.5 9.4 7.55 4.24"></path>
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.29 7 12 12 20.71 7"></polyline>
                          <line x1="12" x2="12" y1="22" y2="12"></line>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: '#10182a' }}>Gestion des produits</h3>
                        <p className="text-sm" style={{ color: '#10182a' }}>Gérer le menu et les prix</p>
                      </div>
                      <span className="text-orange-400">→</span>
                    </div>
                  </button>
                </>
              )}

              
              {/* Bouton Mon profil - visible pour tous les utilisateurs */}
<Link 
  to="/admin/profile"
  className="card hover:bg-white transition-colors cursor-pointer border-l-4 border-gray-500 text-left w-full block bg-white"
>
  <div className="flex items-center space-x-4 p-4">
    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center" style={{ border: '1px solid #10182a' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10182a]">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-[#10182a]" /* Charte graphique : Titres principaux en text-[#10182a] */>Mon profil</h3>
      <p className="text-sm text-[#10182a]" /* Charte graphique : Titres principaux en text-[#10182a] */>Modifier mes informations personnelles</p>
      <p className="text-sm" style={{ color: '#10182a' }}>Modifier mes informations personnelles</p>
    </div>
    <span className="text-gray-400">→</span>
  </div>
</Link>

              
              {/* Bouton Se déconnecter - visible pour tous les utilisateurs */}
              <button 
                onClick={handleLogout}
                className="card hover:bg-red-50 transition-colors cursor-pointer border-l-4 border-red-500 text-left w-full mt-4"
              >
                <div className="flex items-center space-x-4 p-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" x2="9" y1="12" y2="12"></line>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">Se déconnecter</h3>
                    <p className="text-sm text-red-600">Quitter l'application</p>
                  </div>
                  <span className="text-red-400">→</span>
                </div>
              </button>
            </div>
          </div>


      </div>
    </div>
  );
};

export default Settings;
