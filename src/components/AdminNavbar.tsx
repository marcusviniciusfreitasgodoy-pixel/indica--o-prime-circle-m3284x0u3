import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Inbox,
  Kanban,
  Users,
  Building,
  UserSquare2,
  Activity,
  LogOut,
  Shield,
  Layers,
  Award,
  Mail,
  Megaphone,
  Settings,
  BarChart3,
  Database,
} from 'lucide-react'
import { GodoyWordmark } from '@/components/brand/GodoyWordmark'

export function AdminNavbar() {
  const { user, roles, logout, isAdmin } = useAuth()
  const location = useLocation()

  const navItems = [
    { label: 'Visão Geral', path: '/admin', icon: Layers },
    { label: 'Relatórios & Gráficos', path: '/admin/relatorios', icon: BarChart3 },
    { label: 'Triagem & Fila', path: '/admin/triagem', icon: Inbox },
    { label: 'Indicações (Funis)', path: '/admin/indicacoes', icon: Kanban },
    { label: 'Recompensas', path: '/admin/recompensas', icon: Award },
    { label: 'Lotes de Pagamento', path: '/admin/lotes', icon: Layers },
    { label: 'Participantes', path: '/admin/participantes', icon: Users },
    { label: 'Base Conhecida (LGPD)', path: '/admin/base-conhecida', icon: Database },
    { label: 'Mensagens', path: '/admin/mensagens', icon: Mail },
    { label: 'Campanhas & Materiais', path: '/admin/campanhas', icon: Megaphone },
    { label: 'Condomínios', path: '/admin/condominios', icon: Building },
    { label: 'Proprietários & Imóveis', path: '/admin/proprietarios', icon: UserSquare2 },
    { label: 'Auditoria', path: '/admin/auditoria', icon: Activity },
    { label: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ]

  if (isAdmin) {
    navItems.push({ label: 'Equipe', path: '/admin/equipe', icon: Shield })
  }

  return (
    <header className="sticky top-0 z-40 w-full navy border-b border-white/10 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2.5 focus:outline-none">
              <GodoyWordmark onDark className="h-6 w-auto" />
              <span className="font-heading text-xs sm:text-sm font-semibold tracking-label text-gold-brand uppercase border-l border-white/20 pl-2.5">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-on-navy font-medium">{user?.name || user?.email}</span>
              <span className="text-[10px] text-on-navy-muted uppercase tracking-wider font-heading">
                {roles.join(', ') || 'Operador'}
              </span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-[1px] border-white/20 text-on-navy hover:bg-white/10 hover:text-white text-xs hidden sm:inline-flex"
            >
              <Link to="/painel">Painel do Indicador</Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-[1px] text-on-navy/80 hover:text-white hover:bg-white/10 text-xs"
            >
              <LogOut className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              Sair
            </Button>
          </div>
        </div>

        {/* Sub-bar with navigation links */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-white/10 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading uppercase tracking-nav whitespace-nowrap transition-colors rounded-[1px] ${
                  isActive
                    ? 'bg-white/10 text-gold-brand font-semibold border border-gold-brand/40'
                    : 'text-on-navy/75 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
