import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages
import LoginPage from './pages/Login'
import AuthConfirmPage from './pages/AuthConfirm'
import DashboardPage from './pages/Dashboard'
import NewReferralPage from './pages/NewReferral'
import ReferralDetailPage from './pages/ReferralDetail'
import ProfilePage from './pages/Profile'
import PublicCapturePage from './pages/PublicCapture'
import AdminDashboardPage from './pages/AdminDashboard'
import AdminTeamPage from './pages/AdminTeam'
import AccessDeniedPage from './pages/AccessDenied'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          {/* Public Capture Form for doormen, síndicos, clients, partners */}
          <Route path="/indicacao/:slugOrId" element={<PublicCapturePage />} />

          {/* Auth Routes */}
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/entrar" replace />} />
          <Route path="/auth/confirmar" element={<AuthConfirmPage />} />
          <Route path="/acesso-negado" element={<AccessDeniedPage />} />

          {/* Root redirect to /painel */}
          <Route path="/" element={<Navigate to="/painel" replace />} />

          {/* Protected Member / Participant Routes */}
          <Route
            path="/painel"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nova-indicacao"
            element={
              <ProtectedRoute>
                <NewReferralPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/indicacao/detalhe/:id"
            element={
              <ProtectedRoute>
                <ReferralDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Internal Routes (admin, operador, financeiro) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireInternal>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/equipe"
            element={
              <ProtectedRoute requireAdmin>
                <AdminTeamPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
