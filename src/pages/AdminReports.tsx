import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Download,
  Calendar,
  Building,
  Users,
  Award,
  Layers,
  ArrowRight,
  ShieldAlert,
  Coins,
  CheckCircle,
  HelpCircle,
  Clock,
  Filter,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

export default function AdminReportsPage() {
  const { isAdmin } = useAuth()
  const [period, setPeriod] = useState<'all' | '30' | '90' | '180' | '365'>('90')
  const [loading, setLoading] = useState(true)

  const [referrals, setReferrals] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [contactAttempts, setContactAttempts] = useState<any[]>([])
  const [duplicateFlags, setDuplicateFlags] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const [refs, parts, cats, cnds, rews, dls, atts, dups, camps] = await Promise.all([
          pb.collection('referrals').getFullList({ sort: '-created' }),
          pb.collection('participants').getFullList(),
          pb.collection('participant_categories').getFullList(),
          pb.collection('condominiums').getFullList(),
          pb.collection('rewards').getFullList({ sort: '-created' }),
          pb.collection('deals').getFullList({ sort: '-created' }),
          pb.collection('contact_attempts').getFullList({ sort: '-created' }),
          pb.collection('duplicate_flags').getFullList(),
          pb.collection('campaigns').getFullList(),
        ])

        setReferrals(refs)
        setParticipants(parts)
        setCategories(cats)
        setCondos(cnds)
        setRewards(rews)
        setDeals(dls)
        setContactAttempts(atts)
        setDuplicateFlags(dups)
        setCampaigns(camps)
      } catch (err) {
        console.error('Erro ao carregar dados dos relatórios:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // Filtragem por período
  const filteredReferrals = useMemo(() => {
    if (period === 'all') return referrals
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return referrals.filter((r) => new Date(r.created) >= cutoff)
  }, [referrals, period])

  const filteredRewards = useMemo(() => {
    if (period === 'all') return rewards
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return rewards.filter((rw) => new Date(rw.created) >= cutoff)
  }, [rewards, period])

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const condoMap = useMemo(() => new Map(condos.map((c) => [c.id, c.name])), [condos])
  const partMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

  // 1. Coortes Mensais de Conversão
  const cohortData = useMemo(() => {
    const cohorts: Record<
      string,
      { mes: string; recebidas: number; captadas: number; vendidas: number }
    > = {}

    referrals.forEach((r) => {
      const date = new Date(r.created)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!cohorts[key]) {
        cohorts[key] = {
          mes: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(2)}`,
          recebidas: 0,
          captadas: 0,
          vendidas: 0,
        }
      }
      cohorts[key].recebidas++
      if (['captada', 'em_divulgacao', 'vendida', 'alugada'].includes(r.status)) {
        cohorts[key].captadas++
      }
      if (['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status)) {
        cohorts[key].vendidas++
      }
    })

    return Object.entries(cohorts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([_, v]) => v)
  }, [referrals])

  // 2. Funil Comparado: Proprietários vs Compradores
  const funnelsCompared = useMemo(() => {
    const props = filteredReferrals.filter(
      (r) => (r.referral_type || r.type) !== 'comprador' && r.type !== 'cliente',
    )
    const buyers = filteredReferrals.filter(
      (r) => (r.referral_type || r.type) === 'comprador' || r.type === 'cliente',
    )

    return [
      {
        etapa: 'Recebidas',
        Proprietarios: props.length,
        Compradores: buyers.length,
      },
      {
        etapa: 'Aceitas',
        Proprietarios: props.filter(
          (r) => !['recebida', 'em_triagem', 'recusada', 'duplicada'].includes(r.status),
        ).length,
        Compradores: buyers.filter(
          (r) => !['recebida', 'em_triagem', 'recusada', 'duplicada'].includes(r.status),
        ).length,
      },
      {
        etapa: 'Qualificadas / Em Atendimento',
        Proprietarios: props.filter((r) =>
          [
            'qualificada',
            'em_negociacao',
            'captacao_solicitada',
            'captada',
            'em_divulgacao',
            'vendida',
            'alugada',
          ].includes(r.status),
        ).length,
        Compradores: buyers.filter((r) =>
          ['em_atendimento', 'visitando', 'proposta', 'comprou', 'alugou'].includes(r.status),
        ).length,
      },
      {
        etapa: 'Captadas / Proposta',
        Proprietarios: props.filter((r) =>
          ['captada', 'em_divulgacao', 'vendida', 'alugada'].includes(r.status),
        ).length,
        Compradores: buyers.filter((r) => ['proposta', 'comprou', 'alugou'].includes(r.status))
          .length,
      },
      {
        etapa: 'Fechadas',
        Proprietarios: props.filter((r) => ['vendida', 'alugada'].includes(r.status)).length,
        Compradores: buyers.filter((r) => ['comprou', 'alugou'].includes(r.status)).length,
      },
    ]
  }, [filteredReferrals])

  // 3. Desempenho por Condomínio
  const condoStats = useMemo(() => {
    const counts: Record<
      string,
      { nome: string; total: number; captadas: number; fechadas: number }
    > = {}
    filteredReferrals.forEach((r) => {
      const cId = r.condominium_id || 'sem_condo'
      const cName = r.condominium_id ? condoMap.get(r.condominium_id) || 'Outros' : 'Não Atribuído'
      if (!counts[cId]) {
        counts[cId] = { nome: cName, total: 0, captadas: 0, fechadas: 0 }
      }
      counts[cId].total++
      if (['captada', 'em_divulgacao', 'vendida', 'alugada'].includes(r.status)) {
        counts[cId].captadas++
      }
      if (['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status)) {
        counts[cId].fechadas++
      }
    })

    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filteredReferrals, condoMap])

  // 4. Ranking Interno de Participantes
  const participantRanking = useMemo(() => {
    const partStats: Record<
      string,
      {
        id: string
        nome: string
        categoria: string
        frente: string
        totalIndicado: number
        captadas: number
        fechadas: number
        premiosEstimados: number
      }
    > = {}

    filteredReferrals.forEach((r) => {
      const pId = r.participant_id || 'avulso'
      const pRec = partMap.get(r.participant_id)
      const cat = pRec ? catMap.get(pRec.category_id) : null
      const nome = r.referrer_name || (pRec ? `Participante #${pRec.id.slice(0, 4)}` : 'Avulso')

      if (!partStats[pId]) {
        partStats[pId] = {
          id: pId,
          nome,
          categoria: cat?.name || 'Direto',
          frente: cat?.front || 'outros',
          totalIndicado: 0,
          captadas: 0,
          fechadas: 0,
          premiosEstimados: 0,
        }
      }

      partStats[pId].totalIndicado++
      if (['captada', 'em_divulgacao', 'vendida', 'alugada'].includes(r.status)) {
        partStats[pId].captadas++
      }
      if (['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status)) {
        partStats[pId].fechadas++
      }
    })

    filteredRewards.forEach((rw) => {
      const pId = rw.participant_id || 'avulso'
      if (partStats[pId]) {
        partStats[pId].premiosEstimados += Number(rw.final_amount_brl) || 0
      }
    })

    return Object.values(partStats)
      .sort(
        (a, b) =>
          b.captadas * 2 +
          b.fechadas * 5 +
          b.totalIndicado -
          (a.captadas * 2 + a.fechadas * 5 + a.totalIndicado),
      )
      .slice(0, 10)
  }, [filteredReferrals, filteredRewards, partMap, catMap])

  // 5. Custo por Captação e Recompensas por Marco
  const rewardMilestones = useMemo(() => {
    const res: Record<string, { quantidade: number; totalBrl: number }> = {
      captada: { quantidade: 0, totalBrl: 0 },
      fechamento: { quantidade: 0, totalBrl: 0 },
    }
    filteredRewards.forEach((rw) => {
      const m = rw.milestone || 'captada'
      if (!res[m]) res[m] = { quantidade: 0, totalBrl: 0 }
      res[m].quantidade++
      res[m].totalBrl += Number(rw.final_amount_brl) || 0
    })

    return [
      {
        marco: 'Marco Captação',
        quantidade: res.captada.quantidade,
        valor: res.captada.totalBrl,
      },
      {
        marco: 'Marco Fechamento',
        quantidade: res.fechamento.quantidade,
        valor: res.fechamento.totalBrl,
      },
    ]
  }, [filteredRewards])

  // 6. Vitrines e Atribuições Pendentes
  const vitrineStats = useMemo(() => {
    const vitrineReferrals = filteredReferrals.filter((r) => r.source_origin === 'vitrine')
    const pendingAttributions = filteredReferrals.filter(
      (r) => r.attribution_status === 'pendente' || (r.attribution_hint && !r.participant_id),
    )
    const declinedByGodoy = filteredReferrals.filter((r) => r.status === 'declinada_pela_godoy')

    return {
      totalVitrine: vitrineReferrals.length,
      pendingAttributionsCount: pendingAttributions.length,
      declinedCount: declinedByGodoy.length,
    }
  }, [filteredReferrals])

  // Exportações CSV
  const handleExportCohortCSV = () => {
    const headers = [
      'Mês / Coorte',
      'Recebidas',
      'Captadas',
      'Fechadas',
      'Taxa Conversão Captação (%)',
    ]
    const rows = cohortData.map((c) => [
      c.mes,
      c.recebidas,
      c.captadas,
      c.vendidas,
      c.recebidas > 0 ? ((c.captadas / c.recebidas) * 100).toFixed(1) : '0.0',
    ])
    exportToCSV(`godoy_prime_coortes_${period}`, headers, rows)
  }

  const handleExportRankingCSV = () => {
    const headers = [
      'Participante',
      'Categoria',
      'Frente',
      'Indicações',
      'Captadas',
      'Fechadas',
      'Premiação (BRL)',
    ]
    const rows = participantRanking.map((p) => [
      p.nome,
      p.categoria,
      p.frente,
      p.totalIndicado,
      p.captadas,
      p.fechadas,
      p.premiosEstimados,
    ])
    exportToCSV(`godoy_prime_ranking_${period}`, headers, rows)
  }

  const handleExportCondosCSV = () => {
    const headers = ['Condomínio', 'Indicações', 'Captadas', 'Fechadas']
    const rows = condoStats.map((c) => [c.nome, c.total, c.captadas, c.fechadas])
    exportToCSV(`godoy_prime_condominios_${period}`, headers, rows)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[1px] shadow-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep">
                Relatórios Avançados
              </span>
              <span className="text-xs text-muted-foreground font-mono">Exportação CSV Disponível</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground font-semibold">
              Inteligência de Rede & Conversões
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans">
              Coortes temporais, funis segregados por público, desempenho geográfico e custo por
              captação efetiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center bg-secondary border border-border p-1 text-xs rounded-[1px]">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1.5 ml-1" strokeWidth={1.5} />
              {(['30', '90', '180', 'all'] as const).map((pKey) => {
                const isSelected = period === pKey
                const label = pKey === '30' ? '30d' : pKey === '90' ? '90d' : pKey === '180' ? '180d' : 'Tudo'
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
          </div>
        </div>

        {/* Coortes Mensais & Funis Segregados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Coortes */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Evolução & Conversão por Coorte Mensal
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Taxa de retenção e conversão das safras de indicações
                </p>
              </div>
              <Button
                onClick={handleExportCohortCSV}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 font-heading"
              >
                <Download className="w-3 h-3 mr-1" strokeWidth={1.5} />
                CSV
              </Button>
            </div>

            <div className="h-64 mt-4 w-full">
              {cohortData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cohortData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C7" />
                    <XAxis dataKey="mes" stroke="#1A1714" fontSize={11} />
                    <YAxis stroke="#4A443C" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="recebidas"
                      name="Recebidas"
                      stroke="#0C2340"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="captadas"
                      name="Captadas"
                      stroke="#C4993A"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendidas"
                      name="Fechadas"
                      stroke="#2E7D32"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Funil Separado Proprietários vs Compradores */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Funil Comparativo: Proprietários vs Compradores
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Volume de avanço separado por tipo de indicação
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              {filteredReferrals.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelsCompared} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C7" />
                    <XAxis dataKey="etapa" stroke="#1A1714" fontSize={10} />
                    <YAxis stroke="#4A443C" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Proprietarios"
                      name="Proprietários"
                      fill="#C4993A"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="Compradores"
                      name="Compradores"
                      fill="#0C2340"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Desempenho por Condomínio & Ranking da Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Condomínios de Referência */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Building className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Desempenho por Condomínio (Barra / Recreio)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Edifícios com maior volume de indicações e captações
                </p>
              </div>
              <Button
                onClick={handleExportCondosCSV}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 font-heading"
              >
                <Download className="w-3 h-3 mr-1" strokeWidth={1.5} />
                CSV
              </Button>
            </div>

            <div className="h-64 mt-4 w-full">
              {condoStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={condoStats} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C7" />
                    <XAxis dataKey="nome" stroke="#1A1714" fontSize={10} interval={0} />
                    <YAxis stroke="#4A443C" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F8F6F1',
                        borderColor: '#DDD5C7',
                        color: '#1A1714',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Total Indicações" fill="#64748B" />
                    <Bar dataKey="captadas" name="Captações" fill="#C4993A" />
                    <Bar dataKey="fechadas" name="Fechadas" fill="#2E7D32" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Ranking Interno de Indicadores */}
          <Card className="rounded-[1px] border-border bg-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-serif text-foreground font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Ranking de Participantes (Interno)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                  Apurado estritamente para a equipe (sem exposição pública)
                </p>
              </div>
              <Button
                onClick={handleExportRankingCSV}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 font-heading"
              >
                <Download className="w-3 h-3 mr-1" strokeWidth={1.5} />
                CSV
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              {participantRanking.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-muted-foreground font-sans">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                    <tr>
                      <th className="p-2.5">Participante</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5 text-right">Indicações</th>
                      <th className="p-2.5 text-right">Captadas</th>
                      <th className="p-2.5 text-right">Fechadas</th>
                      <th className="p-2.5 text-right">Premiação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {participantRanking.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-accent/40 transition-colors ${
                          idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                        }`}
                      >
                        <td className="p-2.5 text-foreground font-medium flex items-center gap-1.5">
                          <span className="text-[10px] text-gold-deep font-mono w-4">
                            #{idx + 1}
                          </span>
                          {p.nome}
                        </td>
                        <td className="p-2.5 text-muted-foreground font-sans">{p.categoria}</td>
                        <td className="p-2.5 text-right font-mono text-foreground">
                          {p.totalIndicado}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gold-deep font-semibold">
                          {p.captadas}
                        </td>
                        <td className="p-2.5 text-right font-mono text-success font-semibold">
                          {p.fechadas}
                        </td>
                        <td className="p-2.5 text-right font-mono text-foreground font-medium">
                          R$ {p.premiosEstimados.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* Indicadores Complementares da Seção 9 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[1px] border-border bg-card p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
              <Award className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
              Recompensas por Marco
            </h4>
            <div className="space-y-2 text-xs pt-1 font-sans">
              {rewardMilestones.map((m) => (
                <div key={m.marco} className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">{m.marco}:</span>
                  <span className="font-mono text-gold-deep font-semibold">
                    {m.quantidade} premiações (R$ {m.valor.toLocaleString('pt-BR')})
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
              <Building className="w-4 h-4 text-success" strokeWidth={1.5} />
              Vitrines & Leads de Compradores
            </h4>
            <div className="space-y-2 text-xs pt-1 font-sans">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Leads Gerados por Vitrines:</span>
                <span className="font-mono text-success font-semibold">
                  {vitrineStats.totalVitrine}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Atribuições Pendentes:</span>
                <span className="font-mono text-warning font-semibold">
                  {vitrineStats.pendingAttributionsCount}
                </span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[1px] border-border bg-card p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 font-heading">
              <ShieldAlert className="w-4 h-4 text-info" strokeWidth={1.5} />
              Declínios & Saldo Institucional
            </h4>
            <div className="space-y-2 text-xs pt-1 font-sans">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Declínios Institucionais:</span>
                <span className="font-mono text-foreground font-semibold">
                  {vitrineStats.declinedCount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Reconhecida para o Parceiro:</span>
                <span className="font-mono text-info font-semibold">100% Bonificada</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
