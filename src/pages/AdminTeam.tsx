import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminNavbar } from '@/components/AdminNavbar'
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Governança & Acessos
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold flex items-center gap-2">
              <Users className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Gestão de Equipe e Papéis
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Atribuição e revogação de papéis internos (admin, operador, financeiro) com registro
              auditado.
            </p>
          </div>

          <Badge
            variant="outline"
            className="rounded-[1px] border-border text-gold-deep font-heading text-[11px]"
          >
            Auditado em audit_logs
          </Badge>
        </div>

        {errorMsg && (
          <Alert
            variant="destructive"
            className="rounded-[1px] bg-destructive/10 border-destructive/40 text-destructive font-sans"
          >
            <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="rounded-[1px] bg-success/10 border-success/40 text-success font-sans">
            <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
            <AlertDescription className="text-xs">{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* Info card */}
        <div className="p-4 bg-secondary/60 border border-border text-xs text-foreground space-y-2 rounded-[1px] font-sans">
          <div className="flex items-center gap-2 text-gold-deep font-semibold font-serif text-sm">
            <Shield className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
            Políticas de Controle de Acesso Baseado em Papéis (RBAC)
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Papéis atribuídos ficam estritamente na coleção{' '}
            <code className="text-gold-deep font-mono">user_roles</code>. Usuários comuns não podem
            alterar papéis nem conceder privilégios a si próprios. Administradores não podem remover
            seu próprio papel de admin para prevenir bloqueio acidental. Toda concessão e revogação
            é gravada com carimbo de data, IP e identificador em{' '}
            <code className="text-gold-deep font-mono">audit_logs</code>.
          </p>
        </div>

        {/* Team Members List */}
        <Card className="rounded-[1px] border-border bg-card shadow-subtle">
          <CardHeader>
            <CardTitle className="text-lg font-serif text-foreground font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
              Usuários Registrados na Plataforma ({team.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-sans">
              Atribua ou revogue os papéis internos: <strong>admin</strong>,{' '}
              <strong>operador</strong> ou <strong>financeiro</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 font-sans">
                <Loader2 className="w-8 h-8 animate-spin text-primary" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground">Carregando usuários e papéis...</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {team.map((member) => {
                  const hasAdmin = member.roles.some((r) => r.role === 'admin')
                  const hasOperador = member.roles.some((r) => r.role === 'operador')
                  const hasFinanceiro = member.roles.some((r) => r.role === 'financeiro')
                  const isSelf = member.id === user?.id

                  return (
                    <div
                      key={member.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm font-sans">
                            {member.name}
                          </span>
                          {isSelf && (
                            <Badge className="rounded-[1px] bg-secondary text-gold-deep border border-border text-[10px] font-heading">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.email} {member.phone ? `• ${member.phone}` : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
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
                          <div className="flex items-center bg-secondary border border-border pl-2 pr-1 py-1 rounded-[1px]">
                            <span className="text-xs text-gold-deep font-heading font-semibold mr-1.5">
                              Admin
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf || actionLoading === `remove-${member.id}-admin`}
                              onClick={() => handleRemoveRole(member.id, 'admin')}
                              className="h-6 w-6 p-0 rounded-[1px] text-muted-foreground hover:text-destructive"
                              title={
                                isSelf ? 'Você não pode remover seu próprio papel' : 'Remover papel'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-admin`}
                            onClick={() => handleAssignRole(member.id, 'admin')}
                            className="rounded-[1px] border-border text-foreground hover:border-gold-deep text-xs h-8 font-heading"
                          >
                            <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />+ Admin
                          </Button>
                        )}

                        {/* OPERADOR ROLE */}
                        {hasOperador ? (
                          <div className="flex items-center bg-info/10 border border-info/30 pl-2 pr-1 py-1 rounded-[1px]">
                            <span className="text-xs text-info font-heading font-semibold mr-1.5">
                              Operador
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === `remove-${member.id}-operador`}
                              onClick={() => handleRemoveRole(member.id, 'operador')}
                              className="h-6 w-6 p-0 rounded-[1px] text-muted-foreground hover:text-destructive"
                              title="Remover papel de operador"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-operador`}
                            onClick={() => handleAssignRole(member.id, 'operador')}
                            className="rounded-[1px] border-border text-foreground hover:border-info text-xs h-8 font-heading"
                          >
                            <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />+ Operador
                          </Button>
                        )}

                        {/* FINANCEIRO ROLE */}
                        {hasFinanceiro ? (
                          <div className="flex items-center bg-success/10 border border-success/30 pl-2 pr-1 py-1 rounded-[1px]">
                            <span className="text-xs text-success font-heading font-semibold mr-1.5">
                              Financeiro
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === `remove-${member.id}-financeiro`}
                              onClick={() => handleRemoveRole(member.id, 'financeiro')}
                              className="h-6 w-6 p-0 rounded-[1px] text-muted-foreground hover:text-destructive"
                              title="Remover papel de financeiro"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `assign-${member.id}-financeiro`}
                            onClick={() => handleAssignRole(member.id, 'financeiro')}
                            className="rounded-[1px] border-border text-foreground hover:border-success text-xs h-8 font-heading"
                          >
                            <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />+ Financeiro
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
