import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { StatusBadge, TypeBadge } from '@/components/ReferralBadges'
import { getMemberReferrals, getNetworkMembers, updateReferralStatus } from '@/services/referrals'
import { Referral, Member, ReferralStatus } from '@/types/referral'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PlusCircle,
  Search,
  ArrowRightLeft,
  Clock,
  Phone,
  Eye,
  MoreVertical,
  CheckCircle2,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Inbox,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [referrals, setReferrals] = useState<Referral[]>([])
  const [networkMembers, setNetworkMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [rewardsStats, setRewardsStats] = useState({ aReceber: 0, recebido: 0 })

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReferralStatus>('all')

  const publicLink = user?.public_slug
    ? `${window.location.origin}/indicacao/${user.public_slug}`
    : `${window.location.origin}/indicacao/${user?.id || ''}`

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const refs = await getMemberReferrals()
        setReferrals(refs)

        // Carrega membros de forma resiliente
        try {
          const members = await getNetworkMembers()
          setNetworkMembers(members)
        } catch {
          if (user) setNetworkMembers([user])
        }

        // Carrega recompensas reais do participante
        if (user) {
          try {
            const partRec = await pb
              .collection('participants')
              .getFirstListItem(`user_id = '${user.id}'`)
            if (partRec) {
              const rList = await pb.collection('rewards').getFullList({
                filter: `participant_id = '${partRec.id}'`,
              })
              const pending = rList
                .filter((r: any) =>
                  [
                    'aguardando_comissao',
                    'em_analise',
                    'em_revisao_admin',
                    'pendente_dados',
                    'aprovada',
                    'em_lote',
                  ].includes(r.status),
                )
                .reduce((s: number, r: any) => s + (Number(r.final_amount_brl) || 0), 0)
              const paid = rList
                .filter((r: any) => r.status === 'paga')
                .reduce((s: number, r: any) => s + (Number(r.final_amount_brl) || 0), 0)
              setRewardsStats({ aReceber: pending, recebido: paid })
            }
          } catch {
            /* Se participante não tem registro ainda, métricas ficam em zero */
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
        // Se a chamada falhou mas não há indicações, não alarma o usuário com toast destrutivo desnecessário
        setReferrals([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink)
    setCopiedLink(true)
    toast({
      title: 'Link copiado!',
      description:
        'Envie para porteiros, síndicos, clientes e parceiros captarem imóveis e clientes para você.',
    })
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Handle Quick status change
  const handleQuickStatusChange = async (referral: Referral, newStatus: ReferralStatus) => {
    if (!user) return
    try {
      await updateReferralStatus(referral, newStatus, user.id, user.name)
      setReferrals((prev) =>
        prev.map((r) => (r.id === referral.id ? { ...r, status: newStatus } : r)),
      )
      toast({
        title: 'Status atualizado',
        description: `Indicação marcada como "${newStatus}".`,
      })
      loadData(true)
    } catch (err: unknown) {
      console.error('Erro ao atualizar status:', err)
      const msg =
        err instanceof Error ? err.message : 'Não foi possível atualizar o status da indicação.'
      toast({
        title: 'Erro ao atualizar',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  // Format dates
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

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        r.referrer_name.toLowerCase().includes(q) ||
        r.referrer_phone.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.return_contact.toLowerCase().includes(q)

      if (!matchesSearch) return false

      // Tab / Status filter
      if (statusFilter === 'all') return true
      return r.status === statusFilter
    })
  }, [referrals, searchQuery, statusFilter])

  // Metrics
  const stats = useMemo(() => {
    const total = referrals.length
    const novas = referrals.filter((r) => r.status === 'nova').length
    const emAtendimento = referrals.filter((r) => r.status === 'em_atendimento').length
    const concluidas = referrals.filter((r) => r.status === 'concluida').length

    return { total, novas, emAtendimento, concluidas }
  }, [referrals])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* Top welcome & public link banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Painel do Indicador
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Godoy Prime Indica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Olá, {user?.name || 'Indicador'}
            </h1>
            <p className="text-sm text-slate-400">
              Acompanhe suas captações por doormen, síndicos, clientes e parceiros.
            </p>
          </div>

          {/* Public Capture Link Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-amber-500/30">
            <div className="space-y-0.5 text-xs pr-2">
              <div className="font-medium text-slate-200 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-amber-500" />
                Sua Página Pública de Captação:
              </div>
              <p className="text-slate-500 font-mono text-[11px] truncate max-w-[260px]">
                {publicLink}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicLink}
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs h-9"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar Link
                  </>
                )}
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-9"
              >
                <Link to="/painel/materiais">Materiais & QR</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9"
              >
                <Link to="/nova-indicacao">
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Nova Indicação
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium text-blue-400 flex items-center justify-between">
                <span>Novas Recebidas</span>
                <Sparkles className="h-4 w-4" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-white">{stats.novas}</div>
              <p className="text-[11px] text-slate-400 mt-1">Aguardando atendimento inicial</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium text-amber-400 flex items-center justify-between">
                <span>Em Atendimento</span>
                <Clock className="h-4 w-4" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-white">{stats.emAtendimento}</div>
              <p className="text-[11px] text-slate-400 mt-1">Sob seu contato ativo</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium text-amber-500 flex items-center justify-between">
                <span>A Receber</span>
                <Link
                  to="/painel/recompensas"
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Extrato &rarr;
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-amber-400">
                R$ {rewardsStats.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Em validação ou em lote</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium text-emerald-400 flex items-center justify-between">
                <span>Recebido</span>
                <Link
                  to="/painel/recompensas"
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Ver &rarr;
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                R$ {rewardsStats.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total liquidado</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar por indicador, telefone, descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-sm"
              />
            </div>

            {/* Refresh button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`}
                />
                Atualizar Lista
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}
            className="w-full"
          >
            <TabsList className="bg-slate-900 border border-slate-800 p-1 flex flex-wrap h-auto gap-1">
              <TabsTrigger
                value="all"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Todas ({referrals.length})
              </TabsTrigger>
              <TabsTrigger
                value="nova"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Novas ({referrals.filter((r) => r.status === 'nova').length})
              </TabsTrigger>
              <TabsTrigger
                value="em_atendimento"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Em Atendimento ({referrals.filter((r) => r.status === 'em_atendimento').length})
              </TabsTrigger>
              <TabsTrigger
                value="atendida"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Atendidas ({referrals.filter((r) => r.status === 'atendida').length})
              </TabsTrigger>
              <TabsTrigger
                value="concluida"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Concluídas ({stats.concluidas})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Referrals List / Table */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-2" />
              <p className="text-sm text-slate-400">Carregando indicações...</p>
            </div>
          ) : filteredReferrals.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed text-center">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
                <Inbox className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-white">Nenhuma indicação encontrada</h3>
              <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Nenhuma indicação corresponde aos filtros aplicados.'
                  : 'Você ainda não possui indicações registradas. Compartilhe seu link público com porteiros, síndicos e parceiros, ou adicione manualmente.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={copyPublicLink}
                  variant="outline"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Minha Página Pública
                </Button>
                <Button
                  asChild
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                >
                  <Link to="/nova-indicacao">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Cadastrar Manualmente
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Cards List */
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {filteredReferrals.map((referral) => {
                return (
                  <Card
                    key={referral.id}
                    className="bg-slate-900/90 border-slate-800 hover:border-slate-700 transition-colors text-slate-100 overflow-hidden shadow-md"
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: main info */}
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Header line with badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={referral.status} />
                          <TypeBadge type={referral.type} />
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(referral.created)}
                          </span>
                        </div>

                        {/* Title: referrer name & description */}
                        <div>
                          <h4 className="text-base font-semibold text-white truncate">
                            Indicador: {referral.referrer_name}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                            {referral.description}
                          </p>
                        </div>

                        {/* Metadata row: phone, return contact, channel */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-amber-500" />
                            <strong className="text-slate-300">Tel:</strong>{' '}
                            {referral.referrer_phone}
                          </span>
                          <span>
                            <strong className="text-slate-300">Retorno:</strong>{' '}
                            {referral.return_contact}
                          </span>
                          <span className="text-slate-500">
                            Canal: {referral.channel === 'link_publico' ? 'Link Público' : 'Manual'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs"
                        >
                          <Link to={`/indicacao/detalhe/${referral.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver Detalhes
                          </Link>
                        </Button>

                        {/* Quick status actions */}
                        {referral.status === 'nova' && (
                          <Button
                            size="sm"
                            onClick={() => handleQuickStatusChange(referral, 'em_atendimento')}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs"
                          >
                            Atender
                          </Button>
                        )}

                        {referral.status === 'em_atendimento' && (
                          <Button
                            size="sm"
                            onClick={() => handleQuickStatusChange(referral, 'atendida')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                          >
                            Concluir Atendimento
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="bg-slate-900 border-slate-800 text-slate-200"
                            align="end"
                          >
                            <DropdownMenuLabel className="text-xs text-slate-400">
                              Ações da Indicação
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-800" />

                            {referral.status !== 'em_atendimento' && (
                              <DropdownMenuItem
                                onClick={() => handleQuickStatusChange(referral, 'em_atendimento')}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                              >
                                <Clock className="h-4 w-4 mr-2 text-amber-500" />
                                <span>Marcar Em Atendimento</span>
                              </DropdownMenuItem>
                            )}

                            {referral.status !== 'atendida' && (
                              <DropdownMenuItem
                                onClick={() => handleQuickStatusChange(referral, 'atendida')}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4 mr-2 text-emerald-400" />
                                <span>Marcar Atendida</span>
                              </DropdownMenuItem>
                            )}

                            {referral.status !== 'concluida' && (
                              <DropdownMenuItem
                                onClick={() => handleQuickStatusChange(referral, 'concluida')}
                                className="focus:bg-slate-800 focus:text-white cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2 text-purple-400" />
                                <span>Marcar Concluída</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
