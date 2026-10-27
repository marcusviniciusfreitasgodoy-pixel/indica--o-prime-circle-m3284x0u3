import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Shield,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  agency: string
  created: string
  roles: { id: string; role: string; created: string }[]
}

export default function AdminTeamPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchTeam = async () => {
    try {
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${backendUrl}/backend/v1/admin/team`, {
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Falha ao buscar equipe')
      }
      const data = await res.json()
      setTeam(data.team || [])
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar lista da equipe.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      navigate('/acesso-negado', { replace: true })
      return
    }
    fetchTeam()
  }, [isAdmin, navigate])

  const handleAssignRole = async (targetUserId: string, role: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setActionLoading(`assign-${targetUserId}-${role}`)

    try {
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${backendUrl}/backend/v1/admin/team/assign-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          role,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao atribuir papel')
      }

      setSuccessMsg(data.message || 'Papel atribuído com sucesso.')
      await fetchTeam()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atribuir papel.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveRole = async (targetUserId: string, role: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setActionLoading(`remove-${targetUserId}-${role}`)

    try {
      const backendUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${backendUrl}/backend/v1/admin/team/remove-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          role,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao remover papel')
      }

      setSuccessMsg(data.message || 'Papel removido com sucesso.')
      await fetchTeam()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao remover papel.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-none text-stone-400 hover:text-white"
            >
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar ao Admin
              </Link>
            </Button>
            <div className="h-4 w-[1px] bg-stone-800" />
            <h1 className="font-serif text-lg text-white font-semibold">
              Gestão de Equipe e Papéis
            </h1>
          </div>

          <Badge variant="outline" className="rounded-none border-amber-600/40 text-amber-400">
            Auditado em audit_logs
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {errorMsg && (
          <Alert
            variant="destructive"
            className="rounded-none bg-red-950/60 border-red-800 text-red-200"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="rounded-none bg-emerald-950/60 border-emerald-800 text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-xs">{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* Info card */}
        <div className="p-4 bg-stone-900/60 border border-stone-800 text-xs text-stone-300 space-y-2">
          <div className="flex items-center gap-2 text-amber-500 font-semibold font-serif text-sm">
            <Shield className="w-4 h-4" />
            Políticas de Controle de Acesso Baseado em Papéis (RBAC)
          </div>
          <p className="text-stone-400 leading-relaxed">
            Papéis atribuídos ficam estritamente na coleção{' '}
            <code className="text-amber-400">user_roles</code>. Usuários comuns não podem alterar
            papéis nem conceder privilégios a si próprios. Administradores não podem remover seu
            próprio papel de admin para prevenir bloqueio acidental. Toda concessão e revogação é
            gravada com carimbo de data, IP e identificador em{' '}
            <code className="text-amber-400">audit_logs</code>.
          </p>
        </div>

        {/* Team Members List */}
        <Card className="rounded-none border-stone-800 bg-stone-900/80">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Usuários Registrados na Plataforma ({team.length})
            </CardTitle>
            <CardDescription className="text-xs text-stone-400">
              Atribua ou revogue os papéis internos: <strong>admin</strong>,{' '}
              <strong>operador</strong> ou <strong>financeiro</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs text-stone-400">Carregando usuários e papéis...</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-800/80">
                {team.map((member) => {
                  const hasAdmin = member.roles.some((r) => r.role === 'admin')
                  const hasOperador = member.roles.some((r) => r.role === 'operador')
                  const hasFinanceiro = member.roles.some((r) => r.role === 'financeiro')
                  const isSelf = member.id === user?.id

                  return (
                    <div
                      key={member.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{member.name}</span>
                          {isSelf && (
                            <Badge className="rounded-none bg-stone-800 text-amber-400 border border-stone-700 text-[10px]">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-400">
                          {member.email} {member.phone ? `• ${member.phone}` : ''}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Cadastro em:{' '}
                          {new Date(member.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Current roles and buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* ADMIN ROLE */}
                        {hasAdmin ? (
                          <div className="flex items-center bg-amber-950/40 border border-amber-800/60 pl-2 pr-1 py-1">
                            <span className="text-xs text-amber-400 font-semibold mr-1.5">
                              Admin
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf || actionLoading === `remove-${member.id}-admin`}
                              onClick={() => handleRemoveRole(member.id, 'admin')}
                              className="h-6 w-6 p-0 rounded-none text-stone-400 hover:text-red-400"
                              title={
                                isSelf ? 'Você não pode remover seu próprio papel' : 'Remover papel'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-admin`}
                            onClick={() => handleAssignRole(member.id, 'admin')}
                            className="rounded-none border-stone-800 text-stone-300 hover:border-amber-600 text-xs h-8"
                          >
                            <Plus className="w-3 h-3 mr-1" />+ Admin
                          </Button>
                        )}

                        {/* OPERADOR ROLE */}
                        {hasOperador ? (
                          <div className="flex items-center bg-blue-950/40 border border-blue-800/60 pl-2 pr-1 py-1">
                            <span className="text-xs text-blue-400 font-semibold mr-1.5">
                              Operador
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === `remove-${member.id}-operador`}
                              onClick={() => handleRemoveRole(member.id, 'operador')}
                              className="h-6 w-6 p-0 rounded-none text-stone-400 hover:text-red-400"
                              title="Remover papel de operador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-operador`}
                            onClick={() => handleAssignRole(member.id, 'operador')}
                            className="rounded-none border-stone-800 text-stone-300 hover:border-blue-600 text-xs h-8"
                          >
                            <Plus className="w-3 h-3 mr-1" />+ Operador
                          </Button>
                        )}

                        {/* FINANCEIRO ROLE */}
                        {hasFinanceiro ? (
                          <div className="flex items-center bg-emerald-950/40 border border-emerald-800/60 pl-2 pr-1 py-1">
                            <span className="text-xs text-emerald-400 font-semibold mr-1.5">
                              Financeiro
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === `remove-${member.id}-financeiro`}
                              onClick={() => handleRemoveRole(member.id, 'financeiro')}
                              className="h-6 w-6 p-0 rounded-none text-stone-400 hover:text-red-400"
                              title="Remover papel de financeiro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-financeiro`}
                            onClick={() => handleAssignRole(member.id, 'financeiro')}
                            className="rounded-none border-stone-800 text-stone-300 hover:border-emerald-600 text-xs h-8"
                          >
                            <Plus className="w-3 h-3 mr-1" />+ Financeiro
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
