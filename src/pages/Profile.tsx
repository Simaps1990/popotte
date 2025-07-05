import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Save, User, Lock } from 'lucide-react'

export function Profile() {
  const { profile, updateProfile, changePassword } = useAuth()
  
  // États pour le profil
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  
  // États pour le mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setProfileLoading(true)
    setProfileMessage('')

    try {
      await updateProfile({ 
        full_name: fullName,
        username: username
      })
      setProfileMessage('Informations mises à jour avec succès !')
    } catch (error: any) {
      setProfileMessage('Erreur lors de la mise à jour : ' + error.message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Les nouveaux mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 3) {
      setPasswordMessage('Le nouveau mot de passe doit contenir au moins 3 caractères')
      return
    }

    setPasswordLoading(true)
    setPasswordMessage('')

    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMessage('Mot de passe modifié avec succès !')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setPasswordMessage('Erreur : ' + error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Mode démonstration - Les modifications sont temporaires.
        </p>
      </div>

      {/* Informations personnelles */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <User size={20} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Informations personnelles</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {profileMessage && (
            <div className={`p-4 rounded-lg ${
              profileMessage.includes('succès') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {profileMessage}
            </div>
          )}

          <div className="card">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input mt-1 bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Pseudo
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input mt-1"
                  required
                  placeholder="Votre pseudo"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input mt-1"
                  required
                  placeholder="Votre nom complet"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="w-full btn-primary disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Save size={18} />
            <span>{profileLoading ? 'Mise à jour...' : 'Mettre à jour les informations'}</span>
          </button>
        </form>
      </div>

      {/* Changement de mot de passe */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Lock size={20} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Changer le mot de passe</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordMessage && (
            <div className={`p-4 rounded-lg ${
              passwordMessage.includes('succès') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {passwordMessage}
            </div>
          )}

          <div className="card">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Mot de passe actuel
                </label>
                <div className="relative mt-1">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input pr-10"
                    required
                    placeholder="Votre mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pr-10"
                    required
                    placeholder="Votre nouveau mot de passe"
                    minLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pr-10"
                    required
                    placeholder="Confirmez votre nouveau mot de passe"
                    minLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Conseils pour votre mot de passe :</strong>
                </p>
                <ul className="text-xs text-gray-500 mt-1 space-y-1">
                  <li>• Au moins 3 caractères (pas d'exigence complexe en mode démo)</li>
                  <li>• Évitez d'utiliser des informations personnelles</li>
                  <li>• Choisissez quelque chose de facile à retenir</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full btn-primary disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Lock size={18} />
            <span>{passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}