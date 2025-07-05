import React, { createContext, useContext, useEffect, useState } from 'react'
import { mockAuth } from '../lib/mockAuth'
import type { User } from '../lib/mockData'

interface AuthContextType {
  user: User | null
  profile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = mockAuth.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await mockAuth.signIn(email, password)
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    await mockAuth.signUp(email, password, fullName)
  }

  const signOut = async () => {
    await mockAuth.signOut()
  }

  const updateProfile = async (updates: Partial<User>) => {
    await mockAuth.updateProfile(updates)
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await mockAuth.changePassword(currentPassword, newPassword)
  }

  const value = {
    user,
    profile: user, // Dans notre cas, user et profile sont identiques
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}