import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, User, Lock, Save, Loader2 } from 'lucide-react';

type ProfileData = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
};

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [profile, setProfile] = useState<ProfileData>({
    email: '',
    username: '',
    first_name: '',
    last_name: ''
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // Récupérer les données de base depuis les métadonnées utilisateur
        const fullName = user.user_metadata?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const initialProfile = {
          email: user.email || '',
          username: user.user_metadata?.username || '',
          first_name: firstName,
          last_name: lastName
        };
        
        setProfile(initialProfile);
        
        // Récupérer les données directement depuis la table profiles standard
        try {
          console.log('Récupération du profil depuis la table profiles...');
          const { data, error } = await supabase
            .from('profiles')
            .select('username, first_name, last_name')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            console.log('Profil récupéré depuis profiles:', data);
            // Combiner les données de profiles avec les métadonnées
            setProfile({
              ...initialProfile,
              username: data.username || initialProfile.username,
              first_name: data.first_name || initialProfile.first_name,
              last_name: data.last_name || initialProfile.last_name
            });
          } else if (error) {
            console.warn('Erreur lors de la récupération du profil depuis profiles:', error);
          }
        } catch (profileError) {
          console.warn('Impossible de récupérer les données de profil:', profileError);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données de profil:', error);
        toast.error('Erreur lors du chargement des données de profil');
      }
    };
    
    fetchProfileData();
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Protection contre les mises à jour multiples
      if (isUpdating) {
        console.warn('⚠️ Une mise à jour est déjà en cours, opération ignorée');
        return;
      }
      
      console.log('🔍 DÉBUT updateProfile - Soumission du formulaire de profil');
      console.log('🧩 Données du formulaire à envoyer:', profile);
      
      if (!user) {
        console.error('❌ ERREUR: Aucun utilisateur connecté');
        toast.error('Vous devez être connecté pour mettre à jour votre profil');
        return;
      }
      
      console.log('👤 ID utilisateur:', user.id);
      
      // Activer le loader et le flag de mise à jour
      console.log('⏳ Début du processus de mise à jour - Activation du loader');
      setIsUpdating(true);
      setLoading(true);
      
      // Préparer les données à mettre à jour
      const updateTimestamp = new Date().toISOString();
      const fullName = `${profile.first_name} ${profile.last_name}`.trim();
      
      // Exécuter les mises à jour en parallèle maintenant que onAuthStateChange est sécurisé
      console.log('🔄 Exécution des mises à jour en parallèle');
      
      const updatePromises = [
        // 1. Mettre à jour les métadonnées utilisateur
        supabase.auth.updateUser({
          data: {
            username: profile.username,
            full_name: fullName
          }
        }),
        
        // 2. Mettre à jour la table profiles
        supabase
          .from('profiles')
          .update({
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            updated_at: updateTimestamp
          })
          .eq('id', user.id)
      ];
      
      // Attendre que toutes les mises à jour soient terminées
      const [userResult, profileResult] = await Promise.all(updatePromises);
      
      // Vérifier les erreurs
      if (userResult.error) {
        console.error('❌ ERREUR lors de la mise à jour des métadonnées:', userResult.error);
        throw userResult.error;
      }
      
      if (profileResult.error) {
        console.error('❌ ERREUR lors de la mise à jour du profil:', profileResult.error);
        throw profileResult.error;
      }
      
      console.log('✅ Métadonnées mises à jour avec succès:', userResult.data);
      console.log('✅ Profil mis à jour avec succès dans profiles');
      
      // Mettre à jour l'état local immédiatement pour éviter d'attendre un rechargement
      console.log('🔄 Mise à jour de l\'interface locale');
      
      // Mettre à jour l'état local du profil avec les nouvelles valeurs
      setProfile(prevProfile => ({
        ...prevProfile,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name
      }));
      
      console.log('✅ Mise à jour de l\'interface avec les données du formulaire');
        
      // Afficher un message de succès immédiatement sans redirection ni rechargement
      console.log('✅ Profil mis à jour avec succès - Pas de redirection');
      toast.success('Profil mis à jour avec succès');
      
      // Désactiver le loader immédiatement
      setLoading(false);
      
    } catch (error: any) {
      console.error('❌ ERREUR GLOBALE lors de la mise à jour du profil:', error);
      console.error('🔍 Type d\'erreur:', typeof error);
      console.error('🔍 Message:', error.message);
      console.error('🔍 Stack:', error.stack);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      console.log('🏁 Fin du processus updateProfile - Désactivation du loader');
      setLoading(false);
      setIsUpdating(false); // Réinitialiser isUpdating pour permettre de nouvelles mises à jour
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Protection contre les mises à jour multiples
    if (isUpdatingPassword) {
      console.warn('⚠️ Une mise à jour du mot de passe est déjà en cours, opération ignorée');
      return;
    }
    
    console.log('🔑 DÉBUT updatePassword - Soumission du formulaire de mot de passe');
    
    if (!user || !user.email) {
      console.error('❌ ERREUR: Aucun utilisateur connecté ou email manquant');
      toast.error('Utilisateur non connecté ou email manquant');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      console.warn('⚠️ Les nouveaux mots de passe ne correspondent pas');
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      console.warn('⚠️ Le mot de passe est trop court');
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      // Activer le loader et le flag de mise à jour
      console.log('⏳ Début du processus de mise à jour du mot de passe - Activation du loader');
      setIsUpdatingPassword(true);
      setLoading(true);
      
      // Vérifier d'abord le mot de passe actuel
      console.log('🔍 Vérification du mot de passe actuel...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });
      
      if (signInError) {
        console.error('❌ Mot de passe actuel incorrect:', signInError.message);
        toast.error('Le mot de passe actuel est incorrect');
        setLoading(false);
        setIsUpdatingPassword(false);
        return;
      }
      
      // Mettre à jour le mot de passe
      console.log('🔄 Mise à jour du mot de passe...');
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        console.error('❌ ERREUR lors de la mise à jour du mot de passe:', error.message);
        throw error;
      }
      
      console.log('✅ Mot de passe mis à jour avec succès');
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      console.log('✅ Formulaire réinitialisé');
      toast.success('Mot de passe mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ ERREUR GLOBALE lors de la mise à jour du mot de passe:', error);
      console.error('🔍 Type d\'erreur:', typeof error);
      console.error('🔍 Message:', error.message);
      console.error('🔍 Stack:', error.stack);
      toast.error(error.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      console.log('🏁 Fin du processus updatePassword - Désactivation du loader');
      setLoading(false);
      setIsUpdatingPassword(false); // Réinitialiser isUpdatingPassword pour permettre de nouvelles mises à jour
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#10182a]">Mon profil</h1>
          <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
          </div>

          <div className="space-y-6">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-primary-500" size={32} />
              </div>
            )}
            
            {/* Informations personnelles */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-800">Informations personnelles</h2>
              </div>
              
              <form onSubmit={updateProfile} className="space-y-4">
                <div className="card p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        disabled
                        value={profile.email}
                        className="input mt-1 bg-white cursor-not-allowed w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                    </div>
                    
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Pseudo
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={profile.username}
                        onChange={handleProfileChange}
                        className="input mt-1 w-full"
                        placeholder="Votre pseudo"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                        Prénom
                      </label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required
                        value={profile.first_name}
                        onChange={handleProfileChange}
                        className="input mt-1 w-full"
                        placeholder="Votre prénom"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                        Nom
                      </label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required
                        value={profile.last_name}
                        onChange={handleProfileChange}
                        className="input mt-1 w-full"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>Enregistrer les modifications</span>
                </button>
              </form>
            </div>

            {/* Changer le mot de passe */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Lock className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-800">Changer le mot de passe</h2>
              </div>
              
              <form onSubmit={updatePassword} className="space-y-4">
                <div className="card p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Mot de passe actuel
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPassword.current ? 'text' : 'password'}
                          required
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="input pr-10 w-full"
                          placeholder="Votre mot de passe actuel"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        Nouveau mot de passe
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showPassword.new ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="input pr-10 w-full"
                          placeholder="Votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword.confirm ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="input pr-10 w-full"
                          placeholder="Confirmez votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Conseils pour votre mot de passe :</strong>
                      </p>
                      <ul className="text-xs text-blue-600 mt-1 space-y-1">
                        <li>• Au moins 6 caractères</li>
                        <li>• Utilisez des lettres, des chiffres et des caractères spéciaux</li>
                        <li>• Évitez les mots de passe courants</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Lock size={18} />
                  )}
                  <span>Modifier le mot de passe</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
