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
import { AdminTriagePage } from './pages/AdminTriage'
import { AdminReferralsPage } from './pages/AdminReferrals'
import { AdminReferralDetailPage } from './pages/AdminReferralDetail'
import { AdminParticipantsPage } from './pages/AdminParticipants'
import { AdminCondominiumsPage } from './pages/AdminCondominiums'
import { AdminOwnersPage } from './pages/AdminOwners'
import { AdminAuditPage } from './pages/AdminAudit'
import { AdminMessagesPage } from './pages/AdminMessages'
import { AdminCampaignsPage } from './pages/AdminCampaigns'
import { AdminRewardsPage } from './pages/AdminRewards'
import { AdminBatchesPage } from './pages/AdminBatches'
import { AdminSettingsPage } from './pages/AdminSettings'
import { MemberRewardsPage } from './pages/MemberRewards'
import { PublicVitrinePage } from './pages/PublicVitrine'
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

          {/* Public Vitrine Route for shared properties */}
          <Route path="/v/:codigo/:imovel" element={<PublicVitrinePage />} />

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
            path="/painel/recompensas"
            element={
              <ProtectedRoute>
                <MemberRewardsPage />
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
            path="/indicacoes/:id"
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
            path="/admin/triagem"
            element={
              <ProtectedRoute requireInternal>
                <AdminTriagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/indicacoes"
            element={
              <ProtectedRoute requireInternal>
                <AdminReferralsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/indicacoes/:id"
            element={
              <ProtectedRoute requireInternal>
                <AdminReferralDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participantes"
            element={
              <ProtectedRoute requireInternal>
                <AdminParticipantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/condominios"
            element={
              <ProtectedRoute requireInternal>
                <AdminCondominiumsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/proprietarios"
            element={
              <ProtectedRoute requireInternal>
                <AdminOwnersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/auditoria"
            element={
              <ProtectedRoute requireInternal>
                <AdminAuditPage />
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

          <Route
            path="/admin/mensagens"
            element={
              <ProtectedRoute requireInternal>
                <AdminMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campanhas"
            element={
              <ProtectedRoute requireInternal>
                <AdminCampaignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/recompensas"
            element={
              <ProtectedRoute requireInternal>
                <AdminRewardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lotes"
            element={
              <ProtectedRoute requireInternal>
                <AdminBatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/configuracoes"
            element={
              <ProtectedRoute requireInternal>
                <AdminSettingsPage />
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
