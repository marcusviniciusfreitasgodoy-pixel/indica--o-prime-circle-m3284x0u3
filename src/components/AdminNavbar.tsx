import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
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
  Coins,
  Settings,
  BarChart3,
  Database,
} from 'lucide-react'

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
    <header className="border-b border-stone-800 bg-stone-900/95 sticky top-0 z-40 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-base tracking-wide text-white font-semibold">
                  Godoy Prime Indica
                </span>
                <span className="text-[10px] text-amber-400 font-sans uppercase tracking-widest">
                  Operação Interna
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-stone-200 font-medium">
                {user?.name || user?.email}
              </span>
              <span className="text-[10px] text-amber-400 uppercase tracking-wider">
                {roles.join(', ') || 'Operador'}
              </span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-none border-stone-700 text-stone-300 text-xs hidden sm:inline-flex"
            >
              <Link to="/painel">Painel do Indicador</Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-none text-stone-400 hover:text-white text-xs"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>

        {/* Sub-bar with navigation links */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-stone-800/80 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap transition-colors rounded-none ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-medium border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
