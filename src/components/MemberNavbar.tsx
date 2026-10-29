import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  PlusCircle,
  User,
  LogOut,
  ExternalLink,
  Sparkles,
  QrCode,
  Menu,
  X,
} from 'lucide-react'

export const MemberNavbar: React.FC = () => {
  const { user, logout, isInternal, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate('/entrar')
  }

  const publicLink = user?.public_slug ? `/i/${user.public_slug}` : `/i/${user?.id || ''}`

  const navItems = [
    { label: 'Painel', path: '/painel', icon: LayoutDashboard },
    { label: 'Materiais & QR Code', path: '/painel/materiais', icon: QrCode },
    { label: 'Recompensas', path: '/painel/recompensas', icon: Sparkles },
    { label: 'Nova Indicação', path: '/nova-indicacao', icon: PlusCircle },
    { label: 'Regulamento', path: '/regulamento', icon: FileText },
    { label: 'Meu Perfil', path: '/perfil', icon: User },
  ]

  const getInitials = (name?: string) => {
    if (!name) return 'PC'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 text-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                Godoy Prime
                <span className="text-[10px] uppercase font-sans tracking-widest font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Indica
                </span>
              </span>
              <span className="text-[11px] text-slate-400 leading-none">
                Programa de Indicações
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Action / User menu */}
        <div className="flex items-center gap-3">
          {/* Quick link button to member's public page */}
          <Link
            to={publicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <span>Ver Meu Link Oficial</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full ring-1 ring-slate-700 hover:ring-amber-500 p-0"
              >
                <Avatar className="h-9 w-9 bg-slate-800 text-amber-400">
                  <AvatarFallback className="bg-slate-800 text-amber-400 text-xs font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-slate-900 border-slate-800 text-slate-200"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">
                    {user?.name || 'Membro'}
                  </p>
                  <p className="text-xs leading-none text-slate-400 truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                asChild
                className="focus:bg-slate-800 focus:text-white cursor-pointer"
              >
                <Link to="/perfil" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Meu Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="focus:bg-slate-800 focus:text-white cursor-pointer"
              >
                <Link
                  to={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                  <span>Meu Link de Indicação</span>
                </Link>
              </DropdownMenuItem>
              {isInternal && (
                <>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem
                    asChild
                    className="focus:bg-amber-950/40 text-amber-400 focus:text-amber-300 cursor-pointer"
                  >
                    <Link to="/admin" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Painel Admin / Interno</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:bg-red-950/40 focus:text-red-300 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sair do Painel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-slate-800/80">
            <Link
              to={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-amber-400 bg-amber-500/10 font-medium"
            >
              <span>Ver Meu Link de Indicação</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
