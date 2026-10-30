import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { StatusBadge, TypeBadge } from '@/components/ReferralBadges'
import {
  getReferralById,
  updateReferralStatus,
  getNetworkMembers,
  parseReferralHistory,
} from '@/services/referrals'
import { Referral, Member, ReferralStatus } from '@/types/referral'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  UserCheck,
  Building2,
  Calendar,
  Phone,
  Loader2,
  History,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Eyebrow, MetaRow } from '@/components/brand'

export default function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [referral, setReferral] = useState<Referral | null>(null)
  const [, setNetworkMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusNotes, setStatusNotes] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [refData, members] = await Promise.all([getReferralById(id), getNetworkMembers()])
      setReferral(refData)
      setNetworkMembers(members)
    } catch (err) {
      console.error('Erro ao carregar indicação:', err)
      toast({
        title: 'Não encontrada',
        description: 'Indicação não encontrada ou você não tem permissão para visualizá-la.',
        variant: 'destructive',
      })
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = async (newStatus: ReferralStatus) => {
    if (!referral || !user) return
    setIsUpdatingStatus(true)
    try {
      await updateReferralStatus(
        referral,
        newStatus,
        user.id,
        user.name,
        statusNotes.trim() || undefined,
      )
      setStatusNotes('')
      toast({
        title: 'Status atualizado',
        description: `Indicação alterada para "${newStatus}".`,
      })
      await loadData()
    } catch (err: unknown) {
      console.error('Erro ao atualizar status:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar status.'
      toast({
        title: 'Erro ao atualizar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <MemberNavbar />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-deep mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground font-sans">
            Carregando detalhes da indicação...
          </p>
        </div>
      </div>
    )
  }

  if (!referral) return null

  const isCurrentOwner = referral.current_owner_id === user?.id
  const historyItems = parseReferralHistory(referral.history)

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-4xl space-y-6">
        {/* Top Back & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center text-xs font-heading font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1 text-gold-deep" strokeWidth={1.5} />
              Voltar ao Painel
            </Link>
            <div className="space-y-1">
              <Eyebrow>INDICAÇÃO · #{referral.id.substring(0, 8).toUpperCase()}</Eyebrow>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
                  Indicação: <em>{referral.referrer_name}</em>
                </h1>
                <StatusBadge status={referral.status} />
                <TypeBadge type={referral.type} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 font-sans">
              <Calendar className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.5} />
              Cadastrada em{' '}
              <span className="font-mono text-foreground">{formatDate(referral.created)}</span> via{' '}
              <strong className="text-foreground">
                {referral.channel === 'link_publico' ? 'Página Pública' : 'Registro Manual'}
              </strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details card */}
            <Card className="bg-card border-border text-card-foreground rounded-[1px] shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base text-foreground font-serif font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                  Dados da Indicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm font-sans">
                <div>
                  <span className="text-xs text-muted-foreground block font-heading font-semibold uppercase tracking-wider mb-1">
                    {referral.type === 'imovel' ? 'Descrição do Imóvel' : 'Descrição do Cliente'}
                  </span>
                  <p className="text-foreground leading-relaxed bg-secondary/50 p-3.5 rounded-[1px] border border-border whitespace-pre-line text-xs sm:text-sm">
                    {referral.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-secondary/40 p-3 rounded-[1px] border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-heading font-semibold">
                      Indicador (Origem)
                    </span>
                    <p className="font-heading font-semibold text-foreground">
                      {referral.referrer_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Phone className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.5} />
                      {referral.referrer_phone}
                    </p>
                  </div>

                  <div className="bg-secondary/40 p-3 rounded-[1px] border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-heading font-semibold">
                      Contato de Retorno
                    </span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {referral.return_contact}
                    </p>
                  </div>
                </div>

                {referral.attended_at && (
                  <div className="text-xs text-muted-foreground pt-2 flex items-center gap-2 border-t border-border font-sans">
                    <Clock className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
                    <span>
                      Primeiro atendimento registrado em:{' '}
                      <span className="font-mono text-foreground">
                        {formatDate(referral.attended_at)}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions for current owner: change status */}
            {isCurrentOwner && (
              <Card className="bg-card border-border text-card-foreground rounded-[1px] shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-base text-foreground font-serif font-bold">
                    Gerenciar Atendimento
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-sans">
                    Atualize a etapa da negociação para registrar no histórico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 font-sans">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="status-note"
                      className="text-xs text-foreground font-heading font-medium"
                    >
                      Anotação de acompanhamento (opcional)
                    </label>
                    <Textarea
                      id="status-note"
                      placeholder="Ex.: contato realizado com o proprietário, visita agendada para sexta-feira..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={2}
                      className="rounded-[1px] text-xs font-sans resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 font-heading">
                    <Button
                      size="sm"
                      variant={referral.status === 'em_atendimento' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('em_atendimento')}
                      disabled={isUpdatingStatus}
                      className="text-xs rounded-[1px] h-8"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                      Em Atendimento
                    </Button>

                    <Button
                      size="sm"
                      variant={referral.status === 'atendida' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('atendida')}
                      disabled={isUpdatingStatus}
                      className="text-xs rounded-[1px] h-8"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                      Marcar Atendida
                    </Button>

                    <Button
                      size="sm"
                      variant={referral.status === 'concluida' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('concluida')}
                      disabled={isUpdatingStatus}
                      className="text-xs rounded-[1px] h-8"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                      Concluir Negociação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History timeline */}
            <Card className="bg-card border-border text-card-foreground rounded-[1px] shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base text-foreground font-serif font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                  Histórico Completo da Indicação
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-sans">
                  Rastreabilidade de origem, repasses e alterações de status.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 font-sans">
                {historyItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum evento registrado no histórico.
                  </p>
                ) : (
                  <div className="relative border-l border-border pl-4 space-y-4">
                    {/* Public status notification banner if non-approved */}
                    {referral.public_reason_code && (
                      <div className="p-3 bg-secondary/50 border border-border text-xs text-foreground mb-3 rounded-[1px]">
                        <strong className="block text-gold-deep font-heading mb-1">
                          Status da Avaliação:
                        </strong>
                        {referral.status_reason ||
                          'Indicação em processo de atendimento pela equipe.'}
                      </div>
                    )}
                    {historyItems.map((item, index) => (
                      <div key={index} className="relative group">
                        {/* Dot */}
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gold-deep border-2 border-background" />
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-heading font-semibold text-foreground">
                              {item.action === 'criada_link_publico' && 'Criada via Link Público'}
                              {item.action === 'criada_manual' && 'Criada Manualmente'}
                              {item.action === 'repasse_manual' && 'Repasse em Parceria'}
                              {item.action === 'repasse_automatico_3_dias' &&
                                'Repasse Automático (3 Dias)'}
                              {item.action.startsWith('status_') && 'Atualização de Status'}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                          {item.reason && (
                            <p className="text-[11px] text-foreground italic bg-secondary/50 p-1.5 rounded-[1px] border border-border mt-1">
                              "{item.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar - 1 col: Network Ownership card */}
          <div className="space-y-6">
            <Card className="bg-card border-border text-card-foreground rounded-[1px] shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                  Membros Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs font-sans">
                {/* Current owner */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-heading font-semibold">
                    Responsável Atual
                  </span>
                  <div className="p-3 rounded-[1px] bg-secondary/50 border border-border space-y-1">
                    <div className="font-heading font-semibold text-foreground text-sm">
                      {referral.expand?.current_owner_id?.name || 'Membro'}
                    </div>
                    {referral.expand?.current_owner_id?.agency && (
                      <p className="text-muted-foreground">
                        {referral.expand.current_owner_id.agency}
                      </p>
                    )}
                    {referral.expand?.current_owner_id?.phone && (
                      <p className="text-foreground font-mono flex items-center gap-1 pt-0.5">
                        <Phone className="h-3 w-3 inline text-gold-deep" strokeWidth={1.5} />
                        {referral.expand.current_owner_id.phone}
                      </p>
                    )}
                    {referral.current_owner_id === user?.id && (
                      <span className="inline-block mt-1 text-[10px] font-heading font-semibold text-success bg-success/15 px-2 py-0.5 rounded-[1px] border border-success/30">
                        Você é o responsável atual
                      </span>
                    )}
                  </div>
                </div>

                {/* Original owner */}
                <div className="space-y-1 pt-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-heading font-semibold">
                    Dono Original (Comunicação)
                  </span>
                  <div className="p-3 rounded-[1px] bg-secondary/50 border border-border space-y-1">
                    <div className="font-heading font-semibold text-foreground">
                      {referral.expand?.original_owner_id?.name || 'Membro'}
                    </div>
                    {referral.expand?.original_owner_id?.agency && (
                      <p className="text-muted-foreground">
                        {referral.expand.original_owner_id.agency}
                      </p>
                    )}
                    {referral.original_owner_id === user?.id && (
                      <span className="inline-block mt-1 text-[10px] font-heading font-semibold text-info bg-info/15 px-2 py-0.5 rounded-[1px] border border-info/30">
                        Comunicação original sua
                      </span>
                    )}
                  </div>
                </div>

                {/* MetaRow info */}
                <div className="pt-2 border-t border-border space-y-1">
                  <MetaRow
                    label="Canal"
                    value={referral.channel === 'link_publico' ? 'Link Público' : 'Registro Manual'}
                  />
                  <MetaRow label="Protocolo" value={referral.id.substring(0, 8).toUpperCase()} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
