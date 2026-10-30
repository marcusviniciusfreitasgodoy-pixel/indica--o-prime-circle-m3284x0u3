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
  Gift,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Eyebrow } from '@/components/brand'

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
  const [clubeBeneficiosUrl, setClubeBeneficiosUrl] = useState<string>('')

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

              // Carregar URL do Clube de benefícios Godoy Prime (item 4)
              if (partRec.status === 'ativo') {
                try {
                  const res = await pb.send<{ url: string }>(
                    '/backend/v1/participant/clube-beneficios',
                    { method: 'GET' },
                  )
                  if (res?.url) {
                    setClubeBeneficiosUrl(res.url)
                  } else {
                    setClubeBeneficiosUrl('')
                  }
                } catch {
                  setClubeBeneficiosUrl('')
                }
              } else {
                setClubeBeneficiosUrl('')
              }
            }
          } catch {
            // Sem participante ainda
            setClubeBeneficiosUrl('')
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
          <Badge className="bg-info/15 text-info border-info/30 font-heading text-xs rounded-[1px]">
            Nova
          </Badge>
        )
      case 'Em análise':
      case 'Em atendimento':
        return (
          <Badge className="bg-info/15 text-info border-info/30 font-heading text-xs rounded-[1px]">
            {stage}
          </Badge>
        )
      case 'Atendimento realizado':
      case 'Imóvel disponível':
        return (
          <Badge className="bg-success/15 text-success border-success/30 font-heading text-xs rounded-[1px]">
            {stage}
          </Badge>
        )
      case 'Concluída':
        return (
          <Badge className="bg-success text-success-foreground font-heading text-xs rounded-[1px]">
            Concluída
          </Badge>
        )
      case 'Reconhecida':
        return (
          <Badge className="bg-gold-light text-primary font-heading text-xs rounded-[1px]">
            Reconhecida
          </Badge>
        )
      case 'Não aproveitada':
        return (
          <Badge className="bg-secondary text-muted-foreground border-border font-heading text-xs rounded-[1px]">
            Não aproveitada
          </Badge>
        )
      default:
        return (
          <Badge className="bg-secondary text-foreground border-border font-heading text-xs rounded-[1px]">
            {stage}
          </Badge>
        )
    }
  }

  // Permite indicação direta no painel? (allowed_channels != 'link_only')
  const allowsDirectSubmission = participantCategory?.allowed_channels === 'link_and_direct'

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 max-w-5xl">
        {/* Banner de Boas-Vindas e Link Pessoal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-[1px] bg-card border border-border shadow-luxury">
          <div className="space-y-1.5">
            <Eyebrow>PAINEL DO INDICADOR · GODOY PRIME REALTY</Eyebrow>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Olá, <em>{user?.name || 'Indicador'}</em>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl font-sans">
              Acompanhe a etapa de cada indicação comunicada. Corretores credenciados com CRECI
              ativo realizam todo o atendimento, visita, avaliação e contrato.
            </p>
          </div>

          {/* Cartão de Ação Rápida */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-secondary/50 p-3 rounded-[1px] border border-border">
            <div className="space-y-0.5 text-xs pr-2">
              <div className="font-heading font-medium text-foreground flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.5} />
                Seu link pessoal exclusivo:
              </div>
              <p className="text-muted-foreground font-mono text-[11px] truncate max-w-[240px]">
                {personalLink}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPersonalLink}
                className="text-xs h-9"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-success" strokeWidth={1.5} />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                    Copiar Link
                  </>
                )}
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs h-9">
                <Link to="/painel/materiais">
                  <QrCode className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  Materiais
                </Link>
              </Button>
              {allowsDirectSubmission && (
                <Button asChild size="sm" className="text-xs h-9">
                  <Link to="/nova-indicacao">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                    Indicar
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Cartão do Clube de Benefícios Godoy Prime (se houver) */}
        {clubeBeneficiosUrl && (
          <Card className="bg-card border-border text-card-foreground shadow-sm rounded-[1px] overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-[1px] bg-secondary border border-border text-gold-deep flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Gift className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Eyebrow>EXCLUSIVO</Eyebrow>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">
                      Clube de benefícios <em>Godoy Prime</em>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl font-sans">
                    Acesso a vantagens, descontos e experiências exclusivas para participantes
                    ativos do programa.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="text-xs sm:text-sm h-9 sm:h-10 px-4 shrink-0"
              >
                <a href={clubeBeneficiosUrl} target="_blank" rel="noopener noreferrer">
                  Acessar Clube
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" strokeWidth={1.5} />
                </a>
              </Button>
            </div>
          </Card>
        )}

        {/* Cartões A RECEBER e RECEBIDO — Recompensas por Indicação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border border-border text-card-foreground rounded-[1px] shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <span className="text-xs font-heading font-semibold text-gold-deep uppercase tracking-wider block">
                  Recompensa por Indicação
                </span>
                <CardTitle className="text-sm font-heading font-semibold text-foreground">
                  A Receber
                </CardTitle>
              </div>
              <div className="w-9 h-9 rounded-[1px] bg-secondary border border-border text-gold-deep flex items-center justify-center">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                R$ {rewardsStats.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                Valor fixo de indicações que cumpriram o marco do regulamento (em análise, aprovada
                ou em lote).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border text-card-foreground rounded-[1px] shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <span className="text-xs font-heading font-semibold text-success uppercase tracking-wider block">
                  Recompensa por Indicação
                </span>
                <CardTitle className="text-sm font-heading font-semibold text-foreground">
                  Recebido
                </CardTitle>
              </div>
              <div className="w-9 h-9 rounded-[1px] bg-success/15 border border-success/30 text-success flex items-center justify-center">
                <Coins className="h-5 w-5" strokeWidth={1.5} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-success">
                R$ {rewardsStats.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                Total liquidado via Pix para chave em nome do indicador com comprovante.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informação sobre os valores fixos do regulamento */}
        <div className="p-3.5 bg-secondary/40 border border-border rounded-[1px] text-xs text-muted-foreground flex items-start gap-2.5 font-sans">
          <ShieldCheck className="h-4 w-4 text-gold-deep shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="space-y-0.5">
            <p className="text-foreground font-heading font-medium">
              Valores fixos da recompensa por indicação:
            </p>
            <p className="leading-relaxed text-[11px]">
              <strong className="font-mono">R$ 100</strong> para indicação de proprietário (venda ou
              locação) com assinatura de autorização ou decisão da Godoy Prime de não prosseguir com
              imóvel qualificado. • <strong className="font-mono">R$ 500</strong> para indicação de
              comprador na primeira visita com corretor credenciado e capacidade demonstrada. A
              recompensa remunera a informação e independe de fechamento.
            </p>
          </div>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                type="text"
                placeholder="Buscar por protocolo, primeiro nome ou bairro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-gold-deep' : ''}`}
                  strokeWidth={1.5}
                />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros por etapa */}
          <div className="flex flex-wrap gap-1.5 font-heading">
            <Button
              size="sm"
              variant={filterStage === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStage('all')}
              className="text-xs h-8"
            >
              Todas ({referralItems.length})
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'nova' ? 'default' : 'outline'}
              onClick={() => setFilterStage('nova')}
              className="text-xs h-8"
            >
              Novas
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'em_atendimento' ? 'default' : 'outline'}
              onClick={() => setFilterStage('em_atendimento')}
              className="text-xs h-8"
            >
              Em Atendimento
            </Button>
            <Button
              size="sm"
              variant={filterStage === 'concluida' ? 'default' : 'outline'}
              onClick={() => setFilterStage('concluida')}
              className="text-xs h-8"
            >
              Concluídas
            </Button>
          </div>
        </div>

        {/* Lista de Indicações */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card rounded-[1px] border border-border text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gold-deep mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground font-sans">Carregando indicações...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-[1px] border border-border border-dashed text-center">
              <div className="h-14 w-14 rounded-[1px] bg-secondary border border-border text-gold-deep flex items-center justify-center mb-3">
                <Inbox className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-serif font-bold text-foreground">
                Nenhuma indicação comunicada
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1 mb-6 leading-relaxed font-sans">
                {searchQuery || filterStage !== 'all'
                  ? 'Nenhuma indicação corresponde aos filtros aplicados.'
                  : 'Você ainda não possui indicações registradas. Compartilhe seu link pessoal ou entregue seu cartão com QR em mãos.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={copyPersonalLink} variant="outline" className="text-xs">
                  <Copy className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                  Copiar Meu Link
                </Button>
                <Button asChild className="text-xs">
                  <Link to="/painel/materiais">
                    <QrCode className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                    Ver Materiais &amp; QR
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => {
                const stage = item.timeline_stage || item.public_stage || 'Nova'
                const isBuyer = item.referral_type === 'comprador'
                const rewardExpected = isBuyer ? 'R$ 500,00' : 'R$ 100,00'

                return (
                  <Card
                    key={item.id}
                    className="bg-card border-border hover:border-gold-deep transition-colors text-card-foreground overflow-hidden rounded-[1px] shadow-sm"
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold-deep px-2 py-0.5 rounded-[1px] bg-secondary border border-border">
                            {item.protocol}
                          </span>
                          {renderStageBadge(stage)}
                          <Badge
                            variant="outline"
                            className="text-[11px] font-heading rounded-[1px]"
                          >
                            {isBuyer ? 'Comprador' : 'Proprietário'}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-sans">
                            <Calendar className="h-3 w-3" strokeWidth={1.5} />
                            {formatDate(item.created)}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm sm:text-base font-serif font-bold text-foreground">
                            {item.indicated_first_name} ·{' '}
                            <span className="text-muted-foreground font-sans font-normal">
                              {item.neighborhood}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-sans">
                            {item.public_summary || 'Indicação comunicada à Godoy Prime Realty.'}
                          </p>
                        </div>

                        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-sans">
                          <span className="text-[11px] uppercase font-heading font-semibold text-gold-deep tracking-wider">
                            Linha do tempo:
                          </span>
                          <span className="text-foreground font-medium">
                            {stage === 'Atendimento realizado' && item.primeira_visita_at
                              ? `Atendimento realizado em ${formatDate(item.primeira_visita_at)} por corretor credenciado com CRECI ativo`
                              : stage}
                          </span>
                        </div>

                        {item.events && item.events.length > 0 && (
                          <div className="pt-1 border-t border-border space-y-1 font-sans">
                            <span className="text-[10px] text-muted-foreground uppercase font-heading tracking-wider block">
                              Última atualização:
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {item.events[item.events.length - 1].public_label} (
                              {formatDate(item.events[item.events.length - 1].created)})
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right */}
                      <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 shrink-0 gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-medium">
                          Recompensa prevista
                        </span>
                        <span className="text-base sm:text-lg font-mono font-bold text-foreground">
                          {rewardExpected}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-sans">
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
