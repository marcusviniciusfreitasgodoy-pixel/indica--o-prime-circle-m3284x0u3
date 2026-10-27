import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireInternal?: boolean
  requireAdmin?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireInternal = false,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, isInternal, isAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-2" />
        <p className="text-sm text-stone-500 font-medium">Carregando dados de acesso...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  // Admin access requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/acesso-negado" state={{ from: location }} replace />
  }

  // Internal team requirement (admin, operador, financeiro)
  if (requireInternal && !isInternal) {
    return <Navigate to="/acesso-negado" state={{ from: location }} replace />
  }

  return <>{children}</>
}
