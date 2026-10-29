import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { getRawMemberReferrals, ParticipantReferralItem } from '@/services/referrals'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  PlusCircle,
  Search,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Inbox,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building,
  Coins,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RewardSummary {
  aReceber: number
  recebido: number
}

interface ParticipantCategoryData {
  name: string
  slug: string
  allowed_channels: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [referralItems, setReferralItems] = useState<ParticipantReferralItem[]>([])
  const [participantCode, setParticipantCode] = useState<string>('')
  const [participantCategory, setParticipantCategory] = useState<ParticipantCategoryData | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [rewardsStats, setRewardsStats] = useState<RewardSummary>({ aReceber: 0, recebido: 0 })

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState<'all' | 'nova' | 'em_atendimento' | 'concluida'>(
    'all',
  )

  const origin = window.location.origin
  // Link oficial do participante pelo código único ou slug
  const personalLinkCode = participantCode || user?.public_slug || user?.id || ''
  const personalLink = `${origin}/i/${personalLinkCode}`

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        // Carrega as indicações do indicador exclusivamente pela rota my-referrals
        const items = await getRawMemberReferrals()
        setReferralItems(items)

        // Carrega dados do participante e recompensas
        if (user) {
          try {
            const partRec = await pb
              .collection('participants')
              .getFirstListItem(`user_id = '${user.id}'`, { expand: 'category_id' })
            if (partRec) {
              setParticipantCode(partRec.referral_code || '')
              const cat = partRec.expand?.category_id as ParticipantCategoryData | undefined
              if (cat) {
                setParticipantCategory({
                  name: cat.name,
                  slug: cat.slug,
                  allowed_channels: cat.allowed_channels,
                })
              }

              // Carregar valores fixos reais das recompensas
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
            // Sem participante ainda
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do painel via my-referrals:', err)
        setReferralItems([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [user],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyPersonalLink = () => {
    navigator.clipboard.writeText(personalLink)
    setCopiedLink(true)
    toast({
      title: 'Link copiado!',
      description: 'Envie para proprietários ou compradores interessados na Barra e Recreio.',
    })
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Filtragem da lista
  const filteredItems = useMemo(() => {
    return referralItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.protocol.toLowerCase().includes(q) ||
        item.indicated_first_name.toLowerCase().includes(q) ||
        (item.neighborhood && item.neighborhood.toLowerCase().includes(q)) ||
        (item.public_summary && item.public_summary.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (filterStage === 'all') return true
      if (filterStage === 'nova') {
        return (
          item.timeline_stage === 'Nova' || item.status === 'nova' || item.status === 'recebida'
        )
      }
      if (filterStage === 'em_atendimento') {
        return (
          item.timeline_stage === 'Em atendimento' ||
          item.timeline_stage === 'Em análise' ||
          item.timeline_stage === 'Atendimento realizado'
        )
      }
      if (filterStage === 'concluida') {
        return item.timeline_stage === 'Concluída' || item.timeline_stage === 'Reconhecida'
      }
      return true
    })
  }, [referralItems, searchQuery, filterStage])

  // Badge para status da linha do tempo
  const renderStageBadge = (stage: string) => {
    switch (stage) {
      case 'Nova':
        return (
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 font-medium text-xs">
            Nova
          </Badge>
        )
      case 'Em análise':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium text-xs">
            Em análise
          </Badge>
        )
      case 'Em atendimento':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-medium text-xs">
            Em atendimento
          </Badge>
        )
      case 'Atendimento realizado':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-medium text-xs">
            Atendimento realizado
          </Badge>
        )
      case 'Imóvel disponível':
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 font-medium text-xs">
            Imóvel disponível
          </Badge>
        )
      case 'Concluída':
        return (
          <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/40 font-medium text-xs">
            Concluída
          </Badge>
        )
      case 'Reconhecida':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-medium text-xs">
            Reconhecida
          </Badge>
        )
      case 'Não aproveitada':
        return (
          <Badge className="bg-slate-800 text-slate-400 border-slate-700 font-medium text-xs">
            Não aproveitada
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-800 text-slate-300 border-slate-700 font-medium text-xs">
            {stage}
          </Badge>
        )
    }
  }

  // Permite indicação direta no painel? (allowed_channels != 'link_only')
  const allowsDirectSubmission = participantCategory?.allowed_channels === 'link_and_direct'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 max-w-5xl">
        {/* Banner de Boas-Vindas e Link Pessoal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Painel do Indicador
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Godoy Prime Realty</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Olá, {user?.name || 'Indicador'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Acompanhe a etapa de cada indicação comunicada. Corretores com CRECI ativo realizam
              todo o atendimento, visita, avaliação e contrato.
            </p>
          </div>

          {/* Cartão de Ação Rápida */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-amber-500/30">
            <div className="space-y-0.5 text-xs pr-2">
              <div className="font-medium text-slate-200 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-amber-500" />
                Seu link pessoal exclusivo:
              </div>
              <p className="text-slate-500 font-mono text-[11px] truncate max-w-[240px]">
                {personalLink}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPersonalLink}
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
                <Link to="/painel/materiais">
                  <QrCode className="h-3.5 w-3.5 mr-1" />
                  Materiais
                </Link>
              </Button>
              {allowsDirectSubmission && (
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9"
                >
                  <Link to="/nova-indicacao">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Indicar
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Cartões A RECEBER e RECEBIDO — Recompensas por Indicação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider block">
                  Recompensa por Indicação
                </span>
                <CardTitle className="text-sm font-semibold text-slate-300">A Receber</CardTitle>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                R$ {rewardsStats.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Valor fixo de indicações que cumpriram o marco do regulamento (em análise, aprovada
                ou em lote).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                  Recompensa por Indicação
                </span>
                <CardTitle className="text-sm font-semibold text-slate-300">Recebido</CardTitle>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                R$ {rewardsStats.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Total liquidado via Pix para chave em nome do indicador com comprovante.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informação sobre os valores fixos do regulamento */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-slate-300 font-medium">Valores fixos da recompensa por indicação:</p>
            <p className="leading-relaxed text-[11px]">
              <strong>R$ 100</strong> para indicação de proprietário (venda ou locação) com
              assinatura de autorização ou decisão da Godoy Prime de não captar proprietário
              qualificado. • <strong>R$ 500</strong> para indicação de comprador na primeira visita
              com corretor e capacidade demonstrada. A recompensa paga a informação e não depende de
              comissão nem de fechamento.
            </p>
          </div>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar por protocolo, primeiro nome ou bairro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500 text-xs sm:text-sm"
              />
            </div>

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
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros por etapa */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={filterStage === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStage('all')}
              className={`text-xs h-8 ${
                filterStage === 'all'
                  ? 'bg-amber-500 text-slate-950 font-semibold hover:bg-amber-600'
                  : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({referralItems.length})
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'nova' ? 'default' : 'outline'}
              onClick={() => setFilterStage('nova')}
              className={`text-xs h-8 ${
                filterStage === 'nova'
                  ? 'bg-amber-500 text-slate-950 font-semibold hover:bg-amber-600'
                  : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Novas
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'em_atendimento' ? 'default' : 'outline'}
              onClick={() => setFilterStage('em_atendimento')}
              className={`text-xs h-8 ${
                filterStage === 'em_atendimento'
                  ? 'bg-amber-500 text-slate-950 font-semibold hover:bg-amber-600'
                  : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Em Atendimento
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'concluida' ? 'default' : 'outline'}
              onClick={() => setFilterStage('concluida')}
              className={`text-xs h-8 ${
                filterStage === 'concluida'
                  ? 'bg-amber-500 text-slate-950 font-semibold hover:bg-amber-600'
                  : 'border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Concluídas
            </Button>
          </div>
        </div>

        {/* Lista de Indicações — Linha do Tempo e Privacidade LGPD */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-2" />
              <p className="text-sm text-slate-400">Carregando indicações via my-referrals...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed text-center">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
                <Inbox className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-white">Nenhuma indicação comunicada</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1 mb-6 leading-relaxed">
                {searchQuery || filterStage !== 'all'
                  ? 'Nenhuma indicação corresponde aos filtros aplicados.'
                  : 'Você ainda não possui indicações registradas. Compartilhe seu link pessoal ou entregue seu cartão com QR em mãos.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={copyPersonalLink}
                  variant="outline"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs"
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar Meu Link
                </Button>
                <Button
                  asChild
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs"
                >
                  <Link to="/painel/materiais">
                    <QrCode className="h-4 w-4 mr-1.5" />
                    Ver Materiais & QR
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => {
                const stage = item.timeline_stage || item.public_stage || 'Nova'
                const isBuyer = item.referral_type === 'comprador'
                const rewardExpected = isBuyer ? 'R$ 500' : 'R$ 100'

                return (
                  <Card
                    key={item.id}
                    className="bg-slate-900/90 border-slate-800 hover:border-slate-700 transition-colors text-slate-100 overflow-hidden shadow-md"
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Protocolo, estágio da linha do tempo, resumo */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Linha de cabeçalho */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {item.protocol}
                          </span>
                          {renderStageBadge(stage)}
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-400 text-[11px]"
                          >
                            {isBuyer ? 'Comprador' : 'Proprietário'}
                          </Badge>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.created)}
                          </span>
                        </div>

                        {/* Título com Primeiro Nome do Indicado e Bairro — Sem telefone/email/endereço completo (LGPD) */}
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-white">
                            {item.indicated_first_name} •{' '}
                            <span className="text-slate-400 font-normal">{item.neighborhood}</span>
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            {item.public_summary || 'Indicação comunicada à Godoy Prime Realty.'}
                          </p>
                        </div>

                        {/* Linha do Tempo de Etapas (Regulamento seção 4.3 / 10) */}
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                            Linha do tempo:
                          </span>
                          <span className="text-slate-300 font-medium">
                            {stage === 'Atendimento realizado' && item.primeira_visita_at
                              ? `Atendimento realizado em ${formatDate(item.primeira_visita_at)} por corretor com CRECI ativo`
                              : stage}
                          </span>
                        </div>

                        {/* Eventos visíveis */}
                        {item.events && item.events.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/60 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                              Última atualização:
                            </span>
                            <div className="text-[11px] text-slate-400">
                              {item.events[item.events.length - 1].public_label} (
                              {formatDate(item.events[item.events.length - 1].created)})
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Recompensa fixa prevista */}
                      <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 shrink-0 gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                          Recompensa prevista
                        </span>
                        <span className="text-base sm:text-lg font-mono font-bold text-amber-400">
                          {rewardExpected}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Valor fixo do regulamento
                        </span>
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
