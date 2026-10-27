import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { Member } from '@/types/referral'

export type InternalRole = 'admin' | 'operador' | 'financeiro'

interface AuthContextType {
  user: Member | null
  isLoading: boolean
  isAuthenticated: boolean
  roles: InternalRole[]
  isAdmin: boolean
  isOperator: boolean
  isFinance: boolean
  isInternal: boolean
  login: (email: string, pass: string) => Promise<void>
  signup: (payload: {
    email: string
    password: string
    name: string
    phone?: string
  }) => Promise<void>
  requestMagicLink: (
    email: string,
  ) => Promise<{ success: boolean; message: string; magic_token?: string }>
  verifyMagicLink: (token: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: unknown }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: unknown }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(null)
  const [roles, setRoles] = useState<InternalRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCurrentUser = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      setUser(null)
      setRoles([])
      setIsLoading(false)
      return
    }

    try {
      const refreshed = await pb.collection('users').getOne<Member>(pb.authStore.record.id)
      setUser(refreshed)

      // Fetch user internal roles
      try {
        const rolesRecords = await pb.collection('user_roles').getFullList({
          filter: `user_id = "${pb.authStore.record.id}"`,
        })
        const mapped = rolesRecords.map((r) => r.role as InternalRole)
        setRoles(mapped)
      } catch {
        setRoles([])
      }
    } catch {
      setUser(pb.authStore.record as unknown as Member)
      setRoles([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()

    // Listen to PocketBase auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      fetchCurrentUser()
    })

    return () => {
      unsubscribe()
    }
  }, [fetchCurrentUser])

  const login = async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword(email.trim().toLowerCase(), pass)
      await fetchCurrentUser()
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async ({
    email,
    password,
    name,
    phone,
  }: {
    email: string
    password: string
    name: string
    phone?: string
  }) => {
    setIsLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      await pb.collection('users').create({
        email: cleanEmail,
        password,
        passwordConfirm: password,
        name: name.trim(),
        phone: phone ? phone.trim() : '',
      })

      try {
        await pb.collection('users').requestVerification(cleanEmail)
      } catch {
        // best-effort email dispatch
      }

      await pb.collection('users').authWithPassword(cleanEmail, password)
      await fetchCurrentUser()
    } finally {
      setIsLoading(false)
    }
  }

  const requestMagicLink = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase()
    const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
    const res = await fetch(`${backendUrl}/backend/v1/auth/request-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Erro ao solicitar link mágico')
    }
    return data
  }

  const verifyMagicLink = async (token: string) => {
    setIsLoading(true)
    try {
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${backendUrl}/backend/v1/auth/verify-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao autenticar com o link')
      }

      pb.authStore.save(data.token, data.record)
      await fetchCurrentUser()
    } finally {
      setIsLoading(false)
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email.trim().toLowerCase())
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setRoles([])
  }

  const refreshUser = async () => {
    await fetchCurrentUser()
  }

  const isAdmin = roles.includes('admin')
  const isOperator = roles.includes('operador')
  const isFinance = roles.includes('financeiro')
  const isInternal = roles.length > 0

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && pb.authStore.isValid,
        roles,
        isAdmin,
        isOperator,
        isFinance,
        isInternal,
        login,
        signup,
        requestMagicLink,
        verifyMagicLink,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
