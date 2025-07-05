// Système d'authentification factice
import { MOCK_USERS, DEFAULT_USER, type User } from './mockData'

// Stockage des mots de passe (en production, ils seraient hashés)
const USER_PASSWORDS: Record<string, string> = {
  'admin@popotte.fr': 'password',
  'marie.dupont@email.fr': 'password',
  'jean.martin@email.fr': 'password',
  'sophie.bernard@email.fr': 'password'
}

class MockAuth {
  private currentUser: User | null = null
  private listeners: ((user: User | null) => void)[] = []

  constructor() {
    // Charger l'utilisateur depuis le localStorage
    const savedUser = localStorage.getItem('mockUser')
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser)
    } else {
      // Connecter automatiquement l'admin par défaut
      this.currentUser = DEFAULT_USER
      localStorage.setItem('mockUser', JSON.stringify(DEFAULT_USER))
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  signIn(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_USERS.find(u => u.email === email)
        if (user && USER_PASSWORDS[email] === password) {
          this.currentUser = user
          localStorage.setItem('mockUser', JSON.stringify(user))
          this.notifyListeners()
          resolve(user)
        } else {
          reject(new Error('Email ou mot de passe incorrect'))
        }
      }, 500)
    })
  }

  signUp(email: string, password: string, fullName: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const existingUser = MOCK_USERS.find(u => u.email === email)
        if (existingUser) {
          reject(new Error('Un compte avec cet email existe déjà'))
          return
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          email,
          full_name: fullName,
          username: email.split('@')[0], // Utiliser la partie avant @ comme username par défaut
          role: 'user',
          created_at: new Date().toISOString()
        }

        MOCK_USERS.push(newUser)
        USER_PASSWORDS[email] = password
        this.currentUser = newUser
        localStorage.setItem('mockUser', JSON.stringify(newUser))
        this.notifyListeners()
        resolve(newUser)
      }, 500)
    })
  }

  signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null
        localStorage.removeItem('mockUser')
        this.notifyListeners()
        resolve()
      }, 200)
    })
  }

  updateProfile(updates: Partial<User>): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.currentUser) {
          reject(new Error('Aucun utilisateur connecté'))
          return
        }

        this.currentUser = { ...this.currentUser, ...updates }
        localStorage.setItem('mockUser', JSON.stringify(this.currentUser))
        
        // Mettre à jour dans la liste des utilisateurs
        const userIndex = MOCK_USERS.findIndex(u => u.id === this.currentUser!.id)
        if (userIndex !== -1) {
          MOCK_USERS[userIndex] = this.currentUser
        }

        this.notifyListeners()
        resolve(this.currentUser)
      }, 300)
    })
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.currentUser) {
          reject(new Error('Aucun utilisateur connecté'))
          return
        }

        if (USER_PASSWORDS[this.currentUser.email] !== currentPassword) {
          reject(new Error('Mot de passe actuel incorrect'))
          return
        }

        USER_PASSWORDS[this.currentUser.email] = newPassword
        resolve()
      }, 300)
    })
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback)
    // Appeler immédiatement avec l'état actuel
    callback(this.currentUser)
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser))
  }
}

export const mockAuth = new MockAuth()