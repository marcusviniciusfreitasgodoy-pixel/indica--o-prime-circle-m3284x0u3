import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Shield,
  FileText,
  Sliders,
  Activity,
  ArrowRight,
  Sparkles,
  LogOut,
  Building,
  CheckCircle,
} from 'lucide-react'

export default function AdminDashboardPage() {
  const { user, roles, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    programsCount: 0,
    categoriesCount: 0,
    condosCount: 0,
    settingsCount: 0,
    teamCount: 0,
    auditCount: 0,
  })
  const [recentAudits, setRecentAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [programs, cats, condos, settings, usersList] = await Promise.all([
          pb.collection('programs').getFullList(),
          pb.collection('participant_categories').getFullList(),
          pb.collection('condominiums').getFullList(),
          pb.collection('program_settings').getFullList(),
          pb.collection('users').getFullList(),
        ])

        let auditsList: any[] = []
        if (isAdmin) {
          try {
            const auditRes = await pb.collection('audit_logs').getList(1, 10, {
              sort: '-created',
            })
            auditsList = auditRes.items || []
          } catch {
            auditsList = []
          }
        }

        setStats({
          programsCount: programs.length,
          categoriesCount: cats.length,
          condosCount: condos.length,
          settingsCount: settings.length,
          teamCount: usersList.length,
          auditCount: auditsList.length,
        })
        setRecentAudits(auditsList)
      } catch (err) {
        console.error('Erro ao carregar dados do admin:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAdmin])

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Top Navigation */}
      <header className="border-b border-stone-800 bg-stone-900/90 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif text-lg text-white font-semibold">Prime Circle</span>
              <span className="ml-2 text-xs uppercase tracking-wider text-amber-500 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5">
                Área Interna
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-stone-300 font-medium">
                {user?.name || user?.email}
              </span>
              <span className="text-[10px] text-amber-400 capitalize">
                {roles.join(', ') || 'Equipe Interna'}
              </span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-none border-stone-800 text-stone-300 text-xs"
            >
              <Link to="/painel">Ver Painel Participante</Link>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="border border-stone-800 bg-stone-900/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif text-white">
              Painel de Gestão e Operações
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              Controle central do programa de indicação, regras de negócio e permissões de acesso.
            </p>
          </div>

          {isAdmin && (
            <Button
              asChild
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold self-start md:self-auto"
            >
              <Link to="/admin/equipe">
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Equipe e Papéis
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-none border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-sans">
                Frentes / Programas
              </span>
              <Building className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif text-white">{stats.programsCount}</div>
            <p className="text-[11px] text-stone-500 mt-1">Comunidade & Parceiros</p>
          </Card>

          <Card className="rounded-none border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-sans">
                Categorias Ativas
              </span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif text-white">{stats.categoriesCount}</div>
            <p className="text-[11px] text-stone-500 mt-1">Porteiros, clientes, corretores...</p>
          </Card>

          <Card className="rounded-none border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-sans">
                Condomínios Semeados
              </span>
              <Building className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif text-white">{stats.condosCount}</div>
            <p className="text-[11px] text-stone-500 mt-1">Barra da Tijuca & Recreio</p>
          </Card>

          <Card className="rounded-none border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-stone-400 uppercase tracking-wider font-sans">
                Parâmetros (Regras)
              </span>
              <Sliders className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-serif text-white">{stats.settingsCount}</div>
            <p className="text-[11px] text-stone-500 mt-1">Prazos, tetos e precedências</p>
          </Card>
        </div>

        {/* Quick Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-none border-stone-800 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Módulos de Controle
              </CardTitle>
              <CardDescription className="text-xs text-stone-400">
                Acesso aos módulos de governança da etapa de fundação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-stone-800 hover:border-amber-600/50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Gestão da Equipe & Papéis</h4>
                  <p className="text-[11px] text-stone-400">
                    Atribuir papéis de admin, operador e financeiro para usuários.
                  </p>
                </div>
                {isAdmin ? (
                  <Button asChild size="sm" variant="ghost" className="rounded-none text-amber-400">
                    <Link to="/admin/equipe">
                      Acessar
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Badge variant="outline" className="rounded-none text-stone-500 border-stone-800">
                    Requer Admin
                  </Badge>
                )}
              </div>

              <div className="p-3 border border-stone-800 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Documentos Jurídicos & Termos
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    5 documentos base registrados com texto provisório aguardando revisão.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-none text-amber-400 border-amber-900/40"
                >
                  5 Minutas Ativas
                </Badge>
              </div>

              <div className="p-3 border border-stone-800 flex items-center justify-between opacity-80">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Parâmetros Operacionais (Seção 5)
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Janela 7 dias, silêncio WhatsApp 21h-8h, apuração dia 10, repasse até dia 25.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-none text-emerald-400 border-emerald-900/40"
                >
                  Configurado
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Preview */}
          <Card className="rounded-none border-stone-800 bg-stone-900/80">
            <CardHeader>
              <CardTitle className="text-lg font-serif text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Auditoria do Sistema (audit_logs)
              </CardTitle>
              <CardDescription className="text-xs text-stone-400">
                Registro imutável das ações críticas de segurança e governança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-2">
                  {recentAudits.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">
                      Nenhum evento registrado ainda.
                    </p>
                  ) : (
                    recentAudits.slice(0, 5).map((log: any) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-stone-950 border border-stone-800 rounded-none text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono text-amber-400 font-semibold">{log.action}</p>
                          <p className="text-[11px] text-stone-400">
                            {log.actor_email || 'Sistema'} • {log.resource_type}
                          </p>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {new Date(log.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4 bg-stone-950 border border-stone-800 text-xs text-stone-400 text-center">
                  Somente administradores possuem autorização de leitura da trilha de auditoria.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
