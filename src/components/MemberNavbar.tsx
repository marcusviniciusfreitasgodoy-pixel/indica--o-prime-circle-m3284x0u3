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
  Award,
  QrCode,
  Menu,
  X,
  FileText,
  Shield,
} from 'lucide-react'
import { GodoyWordmark } from '@/components/brand/GodoyWordmark'

export const MemberNavbar: React.FC = () => {
  const { user, logout, isInternal } = useAuth()
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
    { label: 'Recompensas', path: '/painel/recompensas', icon: Award },
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
    <header className="sticky top-0 z-40 w-full navy border-b border-border/20 backdrop-blur text-primary">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link to="/painel" className="flex items-center gap-2 focus:outline-none shrink-0">
            <GodoyWordmark onDark className="h-5 sm:h-6 w-auto" />
            <span className="font-heading text-[11px] sm:text-sm font-semibold tracking-widest text-primary uppercase border-l border-primary/30 pl-2">
              INDICA
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 font-heading text-xs uppercase tracking-wider">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[1px] transition-colors ${
                    isActive
                      ? 'bg-navy-light text-gold font-semibold'
                      : 'text-primary/75 hover:text-primary hover:bg-navy-light/60'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Action / User menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick link button to member's public page */}
          <Link
            to={publicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-heading font-medium px-3 py-1.5 rounded-[1px] border border-gold-deep/40 text-gold hover:bg-navy-light/60 transition-colors"
          >
            <span>Ver Meu Link Oficial</span>
            <ExternalLink className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.5} />
          </Link>

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 sm:h-9 sm:w-9 rounded-[1px] border border-border/30 hover:border-gold-deep/60 p-0"
              >
                <Avatar className="h-8 w-8 rounded-[1px] bg-navy-light text-gold font-mono font-bold">
                  <AvatarFallback className="bg-navy-light text-gold text-xs font-semibold rounded-[1px]">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-card border-border text-card-foreground font-heading rounded-[1px] shadow-xl"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal text-xs">
                <div className="flex flex-col space-y-1">
                  <p className="font-semibold text-foreground truncate">{user?.name || 'Membro'}</p>
                  <p className="text-[11px] font-sans text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                asChild
                className="focus:bg-secondary focus:text-foreground cursor-pointer text-xs"
              >
                <Link to="/perfil" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span>Meu Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="focus:bg-secondary focus:text-foreground cursor-pointer text-xs"
              >
                <Link
                  to={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span>Meu Link de Indicação</span>
                </Link>
              </DropdownMenuItem>
              {isInternal && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    asChild
                    className="focus:bg-secondary text-gold-deep focus:text-gold cursor-pointer text-xs"
                  >
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                      <span>Painel Admin / Interno</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Sair do Painel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary/80 hover:text-primary hover:bg-navy-light/60 rounded-[1px] h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/20 navy px-3 py-3 space-y-1.5 font-heading text-xs uppercase tracking-wider animate-in fade-in">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-[1px] min-h-[44px] transition-colors ${
                  isActive
                    ? 'bg-navy-light text-gold font-semibold'
                    : 'text-primary/75 hover:bg-navy-light/60 hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <div className="pt-2 border-t border-border/20">
            <Link
              to={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-3 rounded-[1px] text-gold bg-navy-light/50 font-medium min-h-[44px]"
            >
              <span>Ver Meu Link de Indicação</span>
              <ExternalLink className="h-4 w-4 text-gold-deep shrink-0" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
