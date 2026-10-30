import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Building,
  Kanban,
  AlertTriangle,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  Filter,
  DollarSign,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Database,
  BarChart2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { exportToCSV } from '@/lib/csvExport'

const COLORS = [
  '#D4AF37',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#64748B',
]

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth()
  const [period, setPeriod] = useState<'all' | '30' | '90' | '365'>('30')
  const [loading, setLoading] = useState(true)

  const [referrals, setReferrals] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [contactAttempts, setContactAttempts] = useState<any[]>([])
  const [duplicateFlags, setDuplicateFlags] = useState<any[]>([])
  const [recentAudits, setRecentAudits] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [refs, parts, cats, cnds, rews, dls, atts, dups] = await Promise.all([
          pb.collection('referrals').getFullList({ sort: '-created' }),
          pb.collection('participants').getFullList(),
          pb.collection('participant_categories').getFullList(),
          pb.collection('condominiums').getFullList(),
          pb.collection('rewards').getFullList({ sort: '-created' }),
          pb.collection('deals').getFullList({ sort: '-created' }),
          pb.collection('contact_attempts').getFullList({ sort: '-created' }),
          pb.collection('duplicate_flags').getFullList(),
        ])

        setReferrals(refs)
        setParticipants(parts)
        setCategories(cats)
        setCondos(cnds)
        setRewards(rews)
        setDeals(dls)
        setContactAttempts(atts)
        setDuplicateFlags(dups)

        if (isAdmin) {
          try {
            const audits = await pb.collection('audit_logs').getList(1, 6, { sort: '-created' })
            setRecentAudits(audits.items || [])
          } catch {
            setRecentAudits([])
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isAdmin])

  // Filtragem por período
  const filteredReferrals = useMemo(() => {
    if (period === 'all') return referrals
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return referrals.filter((r) => new Date(r.created) >= cutoff)
  }, [referrals, period])

  const filteredDeals = useMemo(() => {
    if (period === 'all') return deals
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return deals.filter((d) => new Date(d.created || d.deal_date) >= cutoff)
  }, [deals, period])

  const filteredRewards = useMemo(() => {
    if (period === 'all') return rewards
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return rewards.filter((rw) => new Date(rw.created) >= cutoff)
  }, [rewards, period])

  // Mapas auxiliares
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const condoMap = useMemo(() => new Map(condos.map((c) => [c.id, c.name])), [condos])
  const partMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

  // KPIs Principais
  const totalReferrals = filteredReferrals.length
  const activeReferrals = filteredReferrals.filter(
    (r) =>
      ![
        'vendida',
        'alugada',
        'comprou',
        'alugou',
        'recusada',
        'duplicada',
        'perdida',
        'retirada',
        'cancelada',
        'declinada_pela_godoy',
      ].includes(r.status),
  ).length

  const capturedReferrals = filteredReferrals.filter((r) =>
    ['captada', 'em_divulgacao', 'vendida', 'alugada'].includes(r.status),
  ).length

  const closedDealsCount = filteredReferrals.filter((r) =>
    ['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status),
  ).length

  const totalVgv = filteredDeals.reduce((acc, d) => acc + (Number(d.value_brl) || 0), 0)
  const totalCommission = filteredDeals.reduce(
    (acc, d) => acc + (Number(d.commission_received_brl) || 0),
    0,
  )
  const totalRewardsPaid = filteredRewards
    .filter((rw) => rw.status === 'paga')
    .reduce((acc, rw) => acc + (Number(rw.final_amount_brl) || 0), 0)
  const totalRewardsPending = filteredRewards
    .filter((rw) => ['em_analise', 'aprovada', 'em_lote'].includes(rw.status))
    .reduce((acc, rw) => acc + (Number(rw.final_amount_brl) || 0), 0)

  // Custo por captação
  const costPerCapture =
    capturedReferrals > 0 ? (totalRewardsPaid + totalRewardsPending) / capturedReferrals : 0

  // SLA de Triagem (tempo médio em dias até aceita/recusada) e SLA de 1º Contato (até 7 dias)
  const slaStats = useMemo(() => {
    let triageDaysSum = 0
    let triageCount = 0
    let contactDaysSum = 0
    let contactCount = 0
    let stalledCount = 0

    const now = Date.now()

    filteredReferrals.forEach((r) => {
      const created = new Date(r.created).getTime()
      const updated = new Date(r.updated || r.created).getTime()
      const daysSince = Math.floor((now - updated) / (1000 * 60 * 60 * 24))

      const isActive = ![
        'vendida',
        'alugada',
        'comprou',
        'alugou',
        'recusada',
        'duplicada',
        'perdida',
        'retirada',
        'cancelada',
        'declinada_pela_godoy',
      ].includes(r.status)

      if (isActive) {
        if (['recebida', 'em_triagem'].includes(r.status) && daysSince >= 5) {
          stalledCount++
        } else if (daysSince >= 10) {
          stalledCount++
        }
      }

      if (
        ['aceita', 'em_contato', 'qualificada', 'captada', 'vendida', 'recusada'].includes(r.status)
      ) {
        const triageDays = Math.max(0, Math.floor((updated - created) / (1000 * 60 * 60 * 24)))
        triageDaysSum += triageDays
        triageCount++
      }
    })

    contactAttempts.forEach((ca) => {
      const ref = referrals.find((r) => r.id === ca.referral_id)
      if (ref) {
        const refCreated = new Date(ref.created).getTime()
        const attCreated = new Date(ca.created).getTime()
        const days = Math.max(0, Math.floor((attCreated - refCreated) / (1000 * 60 * 60 * 24)))
        contactDaysSum += days
        contactCount++
      }
    })

    return {
      avgTriageDays: triageCount > 0 ? (triageDaysSum / triageCount).toFixed(1) : '0.0',
      avgContactDays: contactCount > 0 ? (contactDaysSum / contactCount).toFixed(1) : '0.0',
      stalledCount,
    }
  }, [filteredReferrals, contactAttempts, referrals])

  // Gráfico 1: Funil Geral (Recebidas -> Triadas/Aceitas -> Qualificadas -> Captadas -> Concluídas)
  const funnelData = useMemo(() => {
    const recebidas = filteredReferrals.length
    const aceitas = filteredReferrals.filter(
      (r) => !['recebida', 'em_triagem', 'recusada', 'duplicada'].includes(r.status),
    ).length
    const qualificadas = filteredReferrals.filter((r) =>
      [
        'qualificada',
        'em_negociacao',
        'captacao_solicitada',
        'captada',
        'em_divulgacao',
        'vendida',
        'alugada',
        'visitando',
        'proposta',
        'comprou',
        'alugou',
      ].includes(r.status),
    ).length
    const captadas = filteredReferrals.filter((r) =>
      ['captada', 'em_divulgacao', 'vendida', 'alugada', 'proposta', 'comprou', 'alugou'].includes(
        r.status,
      ),
    ).length
    const concluidas = filteredReferrals.filter((r) =>
      ['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status),
    ).length

    return [
      { etapa: '1. Recebidas', quantidade: recebidas },
      { etapa: '2. Aceitas', quantidade: aceitas },
      { etapa: '3. Qualificadas', quantidade: qualificadas },
      { etapa: '4. Captadas', quantidade: captadas },
      { etapa: '5. Negócios Fechados', quantidade: concluidas },
    ]
  }, [filteredReferrals])

  // Gráfico 2: Distribuição por Frente (Comunidade vs Parceiros)
  const frontData = useMemo(() => {
    let comunidade = 0
    let parceiros = 0
    let outros = 0

    filteredReferrals.forEach((r) => {
      const part = partMap.get(r.participant_id)
      const cat = part ? catMap.get(part.category_id) : null
      if (cat?.front === 'comunidade') comunidade++
      else if (cat?.front === 'parceiros') parceiros++
      else outros++
    })

    const list = [
      { name: 'Comunidade', value: comunidade },
      { name: 'Parceiros', value: parceiros },
    ]
    if (outros > 0) list.push({ name: 'Direto / Outros', value: outros })
    return list.filter((i) => i.value > 0)
  }, [filteredReferrals, partMap, catMap])

  // Gráfico 3: Indicações por Categoria Profissional
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredReferrals.forEach((r) => {
      const part = partMap.get(r.participant_id)
      const cat = part ? catMap.get(part.category_id) : null
      const label = cat ? cat.name : 'Não Atribuída'
      counts[label] = (counts[label] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, count]) => ({ name, quantidade: count }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6)
  }, [filteredReferrals, partMap, catMap])

  // Gráfico 4: Status / Desfecho das Indicações
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      Ativas: 0,
      Concluídas: 0,
      Recusadas: 0,
      Perdidas: 0,
      Declinadas: 0,
    }
    filteredReferrals.forEach((r) => {
      if (['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status)) counts['Concluídas']++
      else if (r.status === 'recusada' || r.status === 'duplicada') counts['Recusadas']++
      else if (r.status === 'perdida' || r.status === 'retirada' || r.status === 'cancelada')
        counts['Perdidas']++
      else if (r.status === 'declinada_pela_godoy') counts['Declinadas']++
      else counts['Ativas']++
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((i) => i.value > 0)
  }, [filteredReferrals])

  // Exportação CSV do resumo
  const handleExportSummaryCSV = () => {
    const headers = [
      'Indicador / Ator',
      'Tipo',
      'Status',
      'Condomínio',
      'Unidade',
      'Frente',
      'Categoria',
      'Criado em',
      'Valor do Negócio (BRL)',
    ]
    const rows = filteredReferrals.map((r) => {
      const part = partMap.get(r.participant_id)
      const cat = part ? catMap.get(part.category_id) : null
      const condoName = r.condominium_id ? condoMap.get(r.condominium_id) || '' : ''
      return [
        r.referrer_name || r.owner_name || 'Anônimo',
        r.referral_type || r.type || 'proprietario',
        r.status,
        condoName,
        r.unit || '',
        cat?.front || 'outros',
        cat?.name || 'Direto',
        r.created ? new Date(r.created).toLocaleDateString('pt-BR') : '',
        r.deal_value_brl || 0,
      ]
    })
    exportToCSV(`godoy_prime_resumo_${period}`, headers, rows)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header e Filtro de Período */}
        <div className="border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[1px] shadow-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep">
                Gestão Executiva
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Dados Reais em Tempo Real
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground font-semibold">
              Painel de Indicadores e Funis
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans">
              Visão consolidada de conversão, SLAs de atendimento, volume de transações e desempenho
              da rede.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center bg-secondary border border-border p-1 text-xs rounded-[1px]">
              <Calendar
                className="w-3.5 h-3.5 text-muted-foreground mr-1.5 ml-1"
                strokeWidth={1.5}
              />
              {(['30', '90', '365', 'all'] as const).map((pKey) => {
                const label =
                  pKey === '30'
                    ? '30 dias'
                    : pKey === '90'
                      ? '90 dias'
                      : pKey === '365'
                        ? '12 meses'
                        : 'Tudo'
                const isSelected = period === pKey
                return (
                  <button
                    key={pKey}
                    onClick={() => setPeriod(pKey)}
                    className={`px-2.5 py-1 text-xs font-heading uppercase tracking-nav transition-colors rounded-[1px] ${
                      isSelected
                        ? 'bg-foreground text-background font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <Button
              onClick={handleExportSummaryCSV}
              variant="outline"
              size="sm"
              className="rounded-[1px] text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              Exportar CSV
            </Button>

            <Button asChild size="sm" variant="default" className="rounded-[1px] text-xs">
              <Link to="/admin/relatorios">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Relatórios Detalhados &rarr;
              </Link>
            </Button>
          </div>
        </div>

        {/* KPIs Principais em Cartões */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="rounded-[1px] border-border bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
              Indicações no Período
            </span>
            <div className="text-2xl font-serif text-foreground font-semibold mt-1 font-mono">
              {totalReferrals}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <span className="font-mono">{activeReferrals}</span> ativas em andamento
            </p>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
              Captações Efetivas
            </span>
            <div className="text-2xl font-serif text-success font-semibold mt-1 font-mono">
              {capturedReferrals}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <span className="font-mono">
                {totalReferrals > 0 ? ((capturedReferrals / totalReferrals) * 100).toFixed(0) : 0}%
              </span>{' '}
              de conversão
            </p>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
              Negócios Fechados
            </span>
            <div className="text-2xl font-serif text-foreground font-semibold mt-1 font-mono">
              {closedDealsCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              VGV{' '}
              <span className="font-mono font-medium">R$ {totalVgv.toLocaleString('pt-BR')}</span>
            </p>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
              SLA Médio Triagem
            </span>
            <div className="text-2xl font-serif text-foreground font-semibold mt-1">
              <span className="font-mono">{slaStats.avgTriageDays}</span>{' '}
              <span className="text-xs font-sans text-muted-foreground">dias</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Meta operacional: até 5 dias</p>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-3.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
              SLA 1º Contato
            </span>
            <div className="text-2xl font-serif text-foreground font-semibold mt-1">
              <span className="font-mono">{slaStats.avgContactDays}</span>{' '}
              <span className="text-xs font-sans text-muted-foreground">dias</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Meta operacional: até 7 dias</p>
          </Card>

          <Card
            className={`rounded-[1px] p-3.5 border ${
              slaStats.stalledCount > 0
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-border bg-card'
            }`}
          >
            <span
              className={`text-[11px] uppercase tracking-label font-heading font-semibold ${
                slaStats.stalledCount > 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              Paradas (SLA)
            </span>
            <div
              className={`text-2xl font-serif mt-1 font-mono font-semibold ${
                slaStats.stalledCount > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {slaStats.stalledCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <Link to="/admin/indicacoes" className="hover:underline text-gold-deep font-heading">
                Ver no pipeline &rarr;
              </Link>
            </p>
          </Card>
        </div>

        {/* Linha de Gráficos Principais (Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funil de Conversão */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Funil de Conversão da Rede
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Evolução das indicações pelas etapas críticas do processo
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              {totalReferrals === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C7" />
                    <XAxis type="number" stroke="#4A443C" fontSize={11} allowDecimals={false} />
                    <YAxis
                      dataKey="etapa"
                      type="category"
                      stroke="#1A1714"
                      fontSize={11}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [val, 'Indicações']}
                    />
                    <Bar dataKey="quantidade" fill="#C4993A" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Indicações por Categoria Profissional */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Desempenho por Categoria
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Volume de indicações originadas por perfil profissional
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              {categoryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C7" />
                    <XAxis dataKey="name" stroke="#1A1714" fontSize={10} interval={0} />
                    <YAxis stroke="#4A443C" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="quantidade" fill="#0C2340" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Distribuição por Frente (Comunidade vs Parceiros) */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Building className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Origem por Frente do Programa
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Proporção de indicações: Comunidade vs Parceiros
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full flex items-center justify-center">
              {frontData.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={frontData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {frontData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Desfecho / Status da Fila */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Composição do Pipeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Status consolidados e desfechos das indicações
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full flex items-center justify-center">
              {statusData.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }: any) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-st-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Resumo Financeiro & Governança LGPD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[1px] border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
                <DollarSign className="w-4 h-4 text-success" strokeWidth={1.5} />
                Métricas de Recompensa
              </h4>
              <Badge className="bg-success/15 text-success border border-success/30 rounded-[1px] text-[10px] uppercase font-mono">
                Financeiro
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60 text-foreground">
                <span className="text-muted-foreground">Premiações Pagas:</span>
                <span className="font-mono text-success font-semibold">
                  R$ {totalRewardsPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60 text-foreground">
                <span className="text-muted-foreground">Premiações Pendentes / Em Lote:</span>
                <span className="font-mono text-warning font-semibold">
                  R$ {totalRewardsPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-foreground">
                <span className="text-muted-foreground">Custo Médio por Captação:</span>
                <span className="font-mono text-foreground font-semibold">
                  R$ {costPerCapture.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full rounded-[1px] text-xs">
              <Link to="/admin/recompensas">
                Ver Módulo de Recompensas
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
              </Link>
            </Button>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
                <Database className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                Base Conhecida & LGPD
              </h4>
              <Badge className="bg-secondary text-foreground border border-border rounded-[1px] text-[10px] uppercase font-mono">
                Etapa 7
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Importação de base conhecida com normalização de telefones (+55) e anonimização de
              dados conforme retenção legal de 24 meses.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-[1px] text-xs">
                <Link to="/admin/base-conhecida">
                  Importar CSV de Base Conhecida
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
                <AlertTriangle className="w-4 h-4 text-warning" strokeWidth={1.5} />
                Auditoria & Segurança
              </h4>
              <Badge className="bg-secondary text-muted-foreground border border-border rounded-[1px] text-[10px] uppercase font-mono">
                Logs
              </Badge>
            </div>
            {isAdmin ? (
              <div className="space-y-2">
                {recentAudits.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 font-sans">
                    Nenhum evento auditado recente.
                  </p>
                ) : (
                  recentAudits.slice(0, 3).map((a: any) => (
                    <div
                      key={a.id}
                      className="text-[11px] p-2 bg-secondary/50 border border-border flex justify-between rounded-[1px]"
                    >
                      <span className="font-mono text-foreground truncate max-w-[150px]">
                        {a.action}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(a.created).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs text-gold-deep hover:text-gold-deep/80"
                >
                  <Link to="/admin/auditoria">Ver Trilha Completa &rarr;</Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-sans">Restrito a administradores.</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
