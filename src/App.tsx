import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import NewReferralPage from './pages/NewReferral'
import ReferralDetailPage from './pages/ReferralDetail'
import ProfilePage from './pages/Profile'
import PublicCapturePage from './pages/PublicCapture'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          {/* Public Capture Form for doormen, síndicos, clients, partners (No Auth Required) */}
          <Route path="/indicacao/:slugOrId" element={<PublicCapturePage />} />

          {/* Member Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Member Routes */}
          <Route
            path="/"
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

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
