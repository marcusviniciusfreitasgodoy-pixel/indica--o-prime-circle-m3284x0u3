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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="border border-stone-800 bg-stone-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-none text-[10px] uppercase tracking-wider">
                Relatórios Avançados (Seção 9)
              </Badge>
              <span className="text-xs text-stone-500 font-mono">Exportação CSV Disponível</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-white">
              Inteligência de Rede & Conversões
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              Coortes temporais, funis segregados por público, desempenho geográfico e custo por
              captação efetiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center bg-stone-950 border border-stone-800 p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-stone-400 mr-1.5 ml-1" />
              <button
                onClick={() => setPeriod('30')}
                className={`px-2.5 py-1 transition-colors ${
                  period === '30'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                30d
              </button>
              <button
                onClick={() => setPeriod('90')}
                className={`px-2.5 py-1 transition-colors ${
                  period === '90'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                90d
              </button>
              <button
                onClick={() => setPeriod('180')}
                className={`px-2.5 py-1 transition-colors ${
                  period === '180'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                180d
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-2.5 py-1 transition-colors ${
                  period === 'all'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Tudo
              </button>
            </div>
          </div>
        </div>

        {/* Coortes Mensais & Funis Segregados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Coortes */}
          <Card className="rounded-none border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-base font-serif text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Evolução & Conversão por Coorte Mensal
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Taxa de retenção e conversão das safras de indicações
                </p>
              </div>
              <Button
                onClick={handleExportCohortCSV}
                variant="ghost"
                size="sm"
                className="text-stone-400 hover:text-white text-xs h-7 px-2"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>

            <div className="h-64 mt-4 w-full">
              {cohortData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-500">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cohortData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="mes" stroke="#d6d3d1" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0a09',
                        borderColor: '#292524',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="recebidas"
                      name="Recebidas"
                      stroke="#60A5FA"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="captadas"
                      name="Captadas"
                      stroke="#F59E0B"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendidas"
                      name="Fechadas"
                      stroke="#10B981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Funil Separado Proprietários vs Compradores */}
          <Card className="rounded-none border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-base font-serif text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Funil Comparativo: Proprietários vs Compradores
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Volume de avanço separado por tipo de indicação
                </p>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              {filteredReferrals.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-500">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelsCompared} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="etapa" stroke="#d6d3d1" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0a09',
                        borderColor: '#292524',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Proprietarios"
                      name="Proprietários"
                      fill="#D4AF37"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Compradores"
                      name="Compradores"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
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
          <Card className="rounded-none border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-base font-serif text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  Desempenho por Condomínio (Barra / Recreio)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Edifícios com maior volume de indicações e captações
                </p>
              </div>
              <Button
                onClick={handleExportCondosCSV}
                variant="ghost"
                size="sm"
                className="text-stone-400 hover:text-white text-xs h-7 px-2"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>

            <div className="h-64 mt-4 w-full">
              {condoStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-500">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={condoStats} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="nome" stroke="#d6d3d1" fontSize={10} interval={0} />
                    <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c0a09',
                        borderColor: '#292524',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Total Indicações" fill="#64748B" />
                    <Bar dataKey="captadas" name="Captações" fill="#D4AF37" />
                    <Bar dataKey="fechadas" name="Fechadas" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Ranking Interno de Indicadores */}
          <Card className="rounded-none border-stone-800 bg-stone-900/70 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-base font-serif text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Ranking de Participantes (Interno)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Apurado estritamente para a equipe (sem exposição pública)
                </p>
              </div>
              <Button
                onClick={handleExportRankingCSV}
                variant="ghost"
                size="sm"
                className="text-stone-400 hover:text-white text-xs h-7 px-2"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              {participantRanking.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-stone-500">
                  Sem dados no período selecionado.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-800 text-stone-400">
                    <tr>
                      <th className="py-2">Participante</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2 text-right">Indicações</th>
                      <th className="py-2 text-right">Captadas</th>
                      <th className="py-2 text-right">Fechadas</th>
                      <th className="py-2 text-right">Premiação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {participantRanking.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-stone-900/50">
                        <td className="py-2 text-stone-200 font-medium flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-mono w-4">
                            #{idx + 1}
                          </span>
                          {p.nome}
                        </td>
                        <td className="py-2 text-stone-400">{p.categoria}</td>
                        <td className="py-2 text-right font-mono text-stone-300">
                          {p.totalIndicado}
                        </td>
                        <td className="py-2 text-right font-mono text-amber-400 font-semibold">
                          {p.captadas}
                        </td>
                        <td className="py-2 text-right font-mono text-emerald-400 font-semibold">
                          {p.fechadas}
                        </td>
                        <td className="py-2 text-right font-mono text-stone-200">
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
          <Card className="rounded-none border-stone-800 bg-stone-900/80 p-5 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Recompensas por Marco
            </h4>
            <div className="space-y-2 text-xs pt-1">
              {rewardMilestones.map((m) => (
                <div key={m.marco} className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-300">{m.marco}:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {m.quantidade} premiações (R$ {m.valor.toLocaleString('pt-BR')})
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-none border-stone-800 bg-stone-900/80 p-5 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              Vitrines & Leads de Compradores
            </h4>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-stone-800">
                <span className="text-stone-300">Leads Gerados por Vitrines:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {vitrineStats.totalVitrine}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800">
                <span className="text-stone-300">Atribuições Pendentes:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {vitrineStats.pendingAttributionsCount}
                </span>
              </div>
            </div>
          </Card>

          <Card className="rounded-none border-stone-800 bg-stone-900/80 p-5 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              Declínios & Saldo Institucional
            </h4>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-stone-800">
                <span className="text-stone-300">Declínios Institucionais:</span>
                <span className="font-mono text-stone-200 font-semibold">
                  {vitrineStats.declinedCount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800">
                <span className="text-stone-300">Reconhecida para o Parceiro:</span>
                <span className="font-mono text-blue-400 font-semibold">100% Bonificada</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
