import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Shield,
  Sliders,
  Activity,
  ArrowRight,
  Building,
  Inbox,
  Kanban,
  UserSquare2,
  AlertTriangle,
  Sliders,
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
    stalledCount: 0,
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

        let stalled = 0
        try {
          const refs = await pb.collection('referrals').getFullList({
            filter:
              "status != 'vendida' && status != 'alugada' && status != 'comprou' && status != 'alugou' && status != 'recusada' && status != 'duplicada' && status != 'perdida' && status != 'retirada' && status != 'cancelada' && status != 'declinada_pela_godoy'",
          })
          const now = Date.now()
          stalled = refs.filter((r: any) => {
            const updatedAt = new Date(r.updated || r.created).getTime()
            const daysSince = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))
            return r.status === 'em_triagem' || r.status === 'recebida'
              ? daysSince >= 5
              : daysSince >= 10
          }).length
        } catch {
          /* intentionally ignored */
        }

        setStats({
          programsCount: programs.length,
          categoriesCount: cats.length,
          condosCount: condos.length,
          settingsCount: settings.length,
          teamCount: usersList.length,
          auditCount: auditsList.length,
          stalledCount: stalled,
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

          <Card className="rounded-none border-red-950/40 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-red-400 uppercase tracking-wider font-sans font-medium">
                Paradas (SLA)
              </span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-serif text-red-400">{stats.stalledCount}</div>
            <p className="text-[11px] text-stone-500 mt-1">
              <Link to="/admin/indicacoes" className="hover:underline text-stone-400">
                Ver no pipeline &rarr;
              </Link>
            </p>
          </Card>
        </div>

        {/* Quick Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-none border-stone-800 bg-stone-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-serif text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Módulos de Operação Interna (Etapa 3)
              </CardTitle>
              <CardDescription className="text-xs text-stone-400">
                Acesso rápido aos fluxos de triagem, funis e auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-stone-800 hover:border-amber-600/50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-amber-400" />
                    Fila de Triagem & Atribuições
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Avaliar novas indicações e verificar alertas de duplicidade lado a lado.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="rounded-none text-amber-400">
                  <Link to="/admin/triagem">
                    Acessar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="p-3 border border-stone-800 hover:border-amber-600/50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Kanban className="w-4 h-4 text-amber-400" />
                    Funis de Captação & Compradores
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Kanban e lista com filtros por condomínio, etapa e indicações paradas.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="rounded-none text-amber-400">
                  <Link to="/admin/indicacoes">
                    Acessar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="p-3 border border-stone-800 hover:border-amber-600/50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <UserSquare2 className="w-4 h-4 text-amber-400" />
                    Proprietários & Base Conhecida
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Busca unificada e controle da janela de precedência de 180 dias.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="rounded-none text-amber-400">
                  <Link to="/admin/proprietarios">
                    Acessar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              <div className="p-3 border border-stone-800 hover:border-amber-600/50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-amber-400" />
                    Condomínios Semeados
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Edifícios da Barra e Recreio e histórico por prédio.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="rounded-none text-amber-400">
                  <Link to="/admin/condominios">
                    Acessar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
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
