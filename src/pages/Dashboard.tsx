import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { StatusBadge, TypeBadge } from '@/components/ReferralBadges'
import { TransferModal } from '@/components/TransferModal'
import {
  getMemberReferrals,
  getNetworkMembers,
  transferReferral,
  updateReferralStatus,
  triggerAutoTransfersCheck,
} from '@/services/referrals'
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

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | ReferralStatus | 'received_transfer' | 'original'
  >('all')

  // Transfer modal
  const [selectedForTransfer, setSelectedForTransfer] = useState<Referral | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  const publicLink = user?.public_slug
    ? `${window.location.origin}/indicacao/${user.public_slug}`
    : `${window.location.origin}/indicacao/${user?.id || ''}`

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        // Trigger background auto-transfers check on 3-day inactivity
        await triggerAutoTransfersCheck()

        const [refs, members] = await Promise.all([getMemberReferrals(), getNetworkMembers()])
        setReferrals(refs)
        setNetworkMembers(members)
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar suas indicações. Tente novamente.',
          variant: 'destructive',
        })
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
      const updated = await updateReferralStatus(referral, newStatus, user.id, user.name)
      setReferrals((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
      toast({
        title: 'Status atualizado',
        description: `Indicação marcada como "${newStatus}".`,
      })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status da indicação.',
        variant: 'destructive',
      })
    }
  }

  // Handle confirm transfer
  const handleConfirmTransfer = async (targetMemberId: string, reason: string) => {
    if (!selectedForTransfer) return
    const res = await transferReferral(selectedForTransfer.id, targetMemberId, reason)
    toast({
      title: 'Repasse concluído',
      description: res.message,
    })
    // Reload data to reflect new status and assignments
    await loadData(true)
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
      if (statusFilter === 'received_transfer') {
        // Current owner is user, but original owner is someone else
        return r.current_owner_id === user?.id && r.original_owner_id !== user?.id
      }
      if (statusFilter === 'original') {
        // User was original owner
        return r.original_owner_id === user?.id
      }
      return r.status === statusFilter
    })
  }, [referrals, searchQuery, statusFilter, user?.id])

  // Metrics
  const stats = useMemo(() => {
    const total = referrals.length
    const novas = referrals.filter(
      (r) => r.status === 'nova' && r.current_owner_id === user?.id,
    ).length
    const emAtendimento = referrals.filter(
      (r) => r.status === 'em_atendimento' && r.current_owner_id === user?.id,
    ).length
    const repassesRecebidos = referrals.filter(
      (r) => r.current_owner_id === user?.id && r.original_owner_id !== user?.id,
    ).length
    const concluidas = referrals.filter((r) => r.status === 'concluida').length

    return { total, novas, emAtendimento, repassesRecebidos, concluidas }
  }, [referrals, user?.id])

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
                Painel do Membro
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{user?.agency || 'Rede Prime Circle'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Olá, {user?.name || 'Membro'}
            </h1>
            <p className="text-sm text-slate-400">
              Acompanhe suas captações por doormen, síndicos, clientes e parceiros da rede.
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
              <CardDescription className="text-xs font-medium text-orange-400 flex items-center justify-between">
                <span>Repasses da Rede</span>
                <ArrowRightLeft className="h-4 w-4" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-white">{stats.repassesRecebidos}</div>
              <p className="text-[11px] text-slate-400 mt-1">Recebidos de outros parceiros</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium text-emerald-400 flex items-center justify-between">
                <span>Total de Indicações</span>
                <UserCheck className="h-4 w-4" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-[11px] text-slate-400 mt-1">{stats.concluidas} finalizadas</p>
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
                value="received_transfer"
                className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-medium"
              >
                Repasses Recebidos ({stats.repassesRecebidos})
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
              <p className="text-sm text-slate-400">Carregando indicações da rede...</p>
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
                const isCurrentOwner = referral.current_owner_id === user?.id
                const isOriginalOwner = referral.original_owner_id === user?.id
                const isTransferredToMe = isCurrentOwner && !isOriginalOwner

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
                          {isTransferredToMe && (
                            <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              Repasse Recebido
                            </span>
                          )}
                          {!isCurrentOwner && (
                            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                              Repassada por você
                            </span>
                          )}
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
                          {referral.expand?.original_owner_id && !isOriginalOwner && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              Origem: {referral.expand.original_owner_id.name}
                            </span>
                          )}
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

                        {isCurrentOwner && (
                          <>
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

                            {/* Dropdown for Repasse / More */}
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

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedForTransfer(referral)
                                    setIsTransferModalOpen(true)
                                  }}
                                  className="text-amber-400 focus:bg-slate-800 focus:text-amber-300 cursor-pointer"
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  <span>Repassar para a Rede</span>
                                </DropdownMenuItem>

                                {referral.status !== 'em_atendimento' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleQuickStatusChange(referral, 'em_atendimento')
                                    }
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
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Transfer modal */}
      <TransferModal
        referral={selectedForTransfer}
        networkMembers={networkMembers}
        currentUserId={user?.id || ''}
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false)
          setSelectedForTransfer(null)
        }}
        onConfirmTransfer={handleConfirmTransfer}
      />
    </div>
  )
}
