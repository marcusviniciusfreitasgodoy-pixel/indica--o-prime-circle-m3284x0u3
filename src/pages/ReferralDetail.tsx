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
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  UserCheck,
  Building2,
  Calendar,
  Phone,
  MessageSquare,
  Sparkles,
  Loader2,
  ShieldAlert,
  History,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [referral, setReferral] = useState<Referral | null>(null)
  const [networkMembers, setNetworkMembers] = useState<Member[]>([])
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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <MemberNavbar />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
          <p className="text-sm text-slate-400">Carregando detalhes da indicação...</p>
        </div>
      </div>
    )
  }

  if (!referral) return null

  const isCurrentOwner = referral.current_owner_id === user?.id
  const isOriginalOwner = referral.original_owner_id === user?.id
  const historyItems = parseReferralHistory(referral.history)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-4xl space-y-6">
        {/* Top Back & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao Painel
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
                Indicação: {referral.referrer_name}
              </h1>
              <StatusBadge status={referral.status} />
              <TypeBadge type={referral.type} />
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Cadastrada em {formatDate(referral.created)} via{' '}
              <strong className="text-slate-300">
                {referral.channel === 'link_publico' ? 'Página Pública' : 'Registro Manual'}
              </strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details card */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Dados da Indicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider mb-1">
                    {referral.type === 'imovel' ? 'Descrição do Imóvel' : 'Descrição do Cliente'}
                  </span>
                  <p className="text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 whitespace-pre-line">
                    {referral.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                      Indicador (Origem)
                    </span>
                    <p className="font-semibold text-white">{referral.referrer_name}</p>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-amber-500" />
                      {referral.referrer_phone}
                    </p>
                  </div>

                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                      Contato de Retorno
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {referral.return_contact}
                    </p>
                  </div>
                </div>

                {referral.attended_at && (
                  <div className="text-xs text-slate-400 pt-2 flex items-center gap-2 border-t border-slate-800/60">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      Primeiro atendimento registrado em: {formatDate(referral.attended_at)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions for current owner: change status */}
            {isCurrentOwner && (
              <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader className="pb-3 border-b border-slate-800/80">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Gerenciar Atendimento
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Atualize a etapa da negociação para registrar no histórico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label htmlFor="status-note" className="text-xs text-slate-300 font-medium">
                      Anotação de acompanhamento (opcional)
                    </label>
                    <Textarea
                      id="status-note"
                      placeholder="Ex.: Liguei para o proprietário, visita agendada para sexta-feira..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={2}
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs focus-visible:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={referral.status === 'em_atendimento' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('em_atendimento')}
                      disabled={isUpdatingStatus}
                      className={`text-xs ${
                        referral.status === 'em_atendimento'
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Em Atendimento
                    </Button>

                    <Button
                      size="sm"
                      variant={referral.status === 'atendida' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('atendida')}
                      disabled={isUpdatingStatus}
                      className={`text-xs ${
                        referral.status === 'atendida'
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Marcar Atendida
                    </Button>

                    <Button
                      size="sm"
                      variant={referral.status === 'concluida' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('concluida')}
                      disabled={isUpdatingStatus}
                      className={`text-xs ${
                        referral.status === 'concluida'
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Concluir Negociação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History timeline */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-500" />
                  Histórico Completo da Indicação
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Rastreabilidade de origem, repasses e alterações de status.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {historyItems.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum evento registrado no histórico.</p>
                ) : (
                  <div className="relative border-l border-slate-800 pl-4 space-y-4">
                    {/* Public status notification banner if non-approved */}
                    {referral.public_reason_code && (
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 mb-3">
                        <strong className="block text-amber-300 mb-1">Status da Avaliação:</strong>
                        {referral.status_reason ||
                          'Indicação em processo de atendimento pela equipe.'}
                      </div>
                    )}
                    {historyItems.map((item, index) => (
                      <div key={index} className="relative group">
                        {/* Dot */}
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-slate-900" />
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">
                              {item.action === 'criada_link_publico' && 'Criada via Link Público'}
                              {item.action === 'criada_manual' && 'Criada Manualmente'}
                              {item.action === 'repasse_manual' && 'Repasse em Parceria'}
                              {item.action === 'repasse_automatico_3_dias' &&
                                'Repasse Automático (3 Dias)'}
                              {item.action.startsWith('status_') && 'Atualização de Status'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.description}
                          </p>
                          {item.reason && (
                            <p className="text-[11px] text-amber-400/90 italic bg-slate-950/40 p-1.5 rounded border border-slate-800/60 mt-1">
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
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Membros Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs">
                {/* Current owner */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Responsável Atual
                  </span>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="font-semibold text-white text-sm">
                      {referral.expand?.current_owner_id?.name || 'Membro'}
                    </div>
                    {referral.expand?.current_owner_id?.agency && (
                      <p className="text-slate-400">{referral.expand.current_owner_id.agency}</p>
                    )}
                    {referral.expand?.current_owner_id?.phone && (
                      <p className="text-amber-400 flex items-center gap-1 pt-0.5">
                        <Phone className="h-3 w-3 inline" />
                        {referral.expand.current_owner_id.phone}
                      </p>
                    )}
                    {referral.current_owner_id === user?.id && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Você é o responsável atual
                      </span>
                    )}
                  </div>
                </div>

                {/* Original owner */}
                <div className="space-y-1 pt-2">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Dono Original (Captação)
                  </span>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="font-semibold text-white">
                      {referral.expand?.original_owner_id?.name || 'Membro'}
                    </div>
                    {referral.expand?.original_owner_id?.agency && (
                      <p className="text-slate-400">{referral.expand.original_owner_id.agency}</p>
                    )}
                    {referral.original_owner_id === user?.id && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        Captação original sua
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
