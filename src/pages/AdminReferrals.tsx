import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Referral, Member, Condominium } from '@/types/referral'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building,
  User,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Kanban as KanbanIcon,
  List as ListIcon,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Pipeline stages for Owners (Captação)
const OWNER_STAGES = [
  { id: 'recebida', label: 'Recebida' },
  { id: 'em_triagem', label: 'Em Triagem' },
  { id: 'aceita', label: 'Aceita' },
  { id: 'em_contato', label: 'Em Contato' },
  { id: 'qualificada', label: 'Qualificada' },
  { id: 'em_negociacao', label: 'Em Negociação' },
  { id: 'captacao_solicitada', label: 'Captação Solicitada' },
  { id: 'captada', label: 'Captada' },
  { id: 'em_divulgacao', label: 'Em Divulgação' },
  { id: 'vendida', label: 'Vendida' },
  { id: 'alugada', label: 'Alugada' },
  { id: 'declinada_pela_godoy', label: 'Declinada Godoy' },
  { id: 'perdida', label: 'Perdida' },
  { id: 'recusada', label: 'Recusada' },
  { id: 'retirada', label: 'Retirada' },
  { id: 'cancelada', label: 'Cancelada' },
]

// Pipeline stages for Buyers (Interessados)
const BUYER_STAGES = [
  { id: 'recebida', label: 'Recebida' },
  { id: 'em_triagem', label: 'Em Triagem' },
  { id: 'aceita', label: 'Aceita' },
  { id: 'em_atendimento', label: 'Em Atendimento' },
  { id: 'visitando', label: 'Visitando Imóveis' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'comprou', label: 'Comprou' },
  { id: 'alugou', label: 'Alugou' },
  { id: 'perdida', label: 'Perdida' },
  { id: 'recusada', label: 'Recusada' },
  { id: 'cancelada', label: 'Cancelada' },
]

export function AdminReferralsPage() {
  const [activeTab, setActiveTab] = useState<'proprietarios' | 'compradores'>('proprietarios')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [operators, setOperators] = useState<Member[]>([])
  const [condos, setCondos] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterCondo, setFilterCondo] = useState('all')
  const [filterOperator, setFilterOperator] = useState('all')
  const [onlyStalled, setOnlyStalled] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const [refsRes, opsRes, condosRes] = await Promise.all([
        pb.collection('referrals').getFullList<Referral>({
          sort: '-created',
          expand: 'current_owner_id,original_owner_id,condominium_id,assigned_operator_id',
        }),
        pb.collection('users').getFullList<Member>({ sort: 'name' }),
        pb.collection('condominiums').getFullList<Condominium>({ sort: 'name' }),
      ])
      setReferrals(refsRes)
      setOperators(opsRes)
      setCondos(condosRes)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar indicações',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Stalled calculation: 5 days in triagem, 10 days in other active stages
  const isStalled = (ref: Referral) => {
    const finalStatuses = [
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
    ]
    if (finalStatuses.includes(ref.status)) return false

    const updatedAt = new Date(ref.updated || ref.created).getTime()
    const now = Date.now()
    const daysSince = (now - updatedAt) / (1000 * 60 * 60 * 24)

    if (ref.status === 'em_triagem' || ref.status === 'recebida') {
      return daysSince >= 5
    }
    return daysSince >= 10
  }

  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const isProp =
        r.referral_type === 'proprietario' ||
        r.type === 'imovel' ||
        r.type === 'proprietario' ||
        r.type === 'proprietario_venda' ||
        r.type === 'proprietario_locacao'
      const matchType = activeTab === 'proprietarios' ? isProp : !isProp

      if (!matchType) return false

      if (filterStage !== 'all' && r.status !== filterStage) return false
      if (filterCondo !== 'all' && r.condominium_id !== filterCondo) return false
      if (filterOperator !== 'all' && r.assigned_operator_id !== filterOperator) return false
      if (onlyStalled && !isStalled(r)) return false

      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName =
          (r.owner_name && r.owner_name.toLowerCase().includes(query)) ||
          (r.buyer_name && r.buyer_name.toLowerCase().includes(query)) ||
          (r.referrer_name && r.referrer_name.toLowerCase().includes(query)) ||
          (r.description && r.description.toLowerCase().includes(query)) ||
          (r.unit && r.unit.toLowerCase().includes(query)) ||
          (r.expand?.condominium_id?.name &&
            r.expand.condominium_id.name.toLowerCase().includes(query))
        if (!matchName) return false
      }

      return true
    })
  }, [referrals, activeTab, filterStage, filterCondo, filterOperator, onlyStalled, search])

  const currentStages = activeTab === 'proprietarios' ? OWNER_STAGES : BUYER_STAGES

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              Gestão de Indicações & Funis
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Kanban e listagem dos funis de Captação de Proprietários e Atendimento de Compradores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={`rounded-none text-xs ${
                viewMode === 'kanban'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border-stone-800 text-stone-300'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5 mr-1.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none text-xs ${
                viewMode === 'list'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border-stone-800 text-stone-300'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5 mr-1.5" />
              Lista
            </Button>
          </div>
        </div>

        {/* Tabs: Proprietários vs Compradores */}
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => {
            setActiveTab(val)
            setFilterStage('all')
          }}
          className="w-full space-y-6"
        >
          <TabsList className="bg-stone-900 border border-stone-800 rounded-none p-1">
            <TabsTrigger
              value="proprietarios"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <Building className="w-3.5 h-3.5 mr-1.5" />
              Proprietários (Captação)
            </TabsTrigger>
            <TabsTrigger
              value="compradores"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <User className="w-3.5 h-3.5 mr-1.5" />
              Compradores & Interessados
            </TabsTrigger>
          </TabsList>

          {/* Filters Bar */}
          <div className="bg-stone-900/60 border border-stone-800 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <Input
                  placeholder="Buscar nome, condomínio, unidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-stone-950 border-stone-800 pl-9 rounded-none text-xs"
                />
              </div>

              <div>
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue placeholder="Todas as Etapas" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="all">Todas as Etapas</SelectItem>
                    {currentStages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterCondo} onValueChange={setFilterCondo}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue placeholder="Todos os Condomínios" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="all">Todos os Condomínios</SelectItem>
                    {condos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.neighborhood})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterOperator} onValueChange={setFilterOperator}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue placeholder="Responsável (Operador)" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="all">Todos os Responsáveis</SelectItem>
                    {operators.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name || o.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyStalled}
                  onChange={(e) => setOnlyStalled(e.target.checked)}
                  className="rounded-none border-stone-700 bg-stone-950 text-amber-500"
                />
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Mostrar apenas indicações paradas (&gt;5 dias em triagem ou &gt;10 dias ativas)
                </span>
              </label>

              <span className="text-xs text-stone-500">
                Total filtrado: <strong>{filteredReferrals.length}</strong> indicações
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-stone-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
              Carregando dados do funil...
            </div>
          ) : viewMode === 'kanban' ? (
            /* KANBAN VIEW */
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
              {currentStages.map((stage) => {
                const stageRefs = filteredReferrals.filter((r) => r.status === stage.id)
                return (
                  <div
                    key={stage.id}
                    className="w-72 shrink-0 bg-stone-900/70 border border-stone-800/80 flex flex-col max-h-[750px]"
                  >
                    {/* Header */}
                    <div className="p-3 border-b border-stone-800/80 bg-stone-900 flex justify-between items-center sticky top-0 z-10">
                      <span className="text-xs font-semibold text-stone-200">{stage.label}</span>
                      <Badge
                        variant="outline"
                        className="rounded-none border-stone-700 text-stone-400 text-[10px]"
                      >
                        {stageRefs.length}
                      </Badge>
                    </div>

                    {/* Cards list */}
                    <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                      {stageRefs.length === 0 ? (
                        <div className="py-8 text-center text-stone-600 text-xs italic">Vazio</div>
                      ) : (
                        stageRefs.map((r) => {
                          const stalled = isStalled(r)
                          return (
                            <Link
                              key={r.id}
                              to={`/admin/indicacoes/${r.id}`}
                              className={`block p-3 bg-stone-950 border transition-colors hover:border-amber-500/50 ${
                                stalled
                                  ? 'border-amber-500/60 shadow-sm shadow-amber-950/40'
                                  : 'border-stone-800'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[11px] font-medium text-stone-200 line-clamp-1">
                                  {r.owner_name || r.buyer_name || r.referrer_name || 'Sem nome'}
                                </span>
                                {stalled && (
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1 py-0 rounded-none shrink-0">
                                    Parada
                                  </Badge>
                                )}
                              </div>

                              {(r.expand?.condominium_id || r.unit) && (
                                <p className="text-[11px] text-amber-300/90 mt-1 line-clamp-1 flex items-center gap-1">
                                  <Building className="w-3 h-3 shrink-0" />
                                  {r.expand?.condominium_id?.name || 'Condomínio'}
                                  {r.unit ? ` - ${r.unit}` : ''}
                                </p>
                              )}

                              <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                                {r.description}
                              </p>

                              <div className="mt-2.5 pt-2 border-t border-stone-900 flex justify-between items-center text-[10px] text-stone-500">
                                <span>#{r.id.substring(0, 6)}</span>
                                <span>
                                  {new Date(r.created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </span>
                              </div>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-stone-900 border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 border-b border-stone-800 text-stone-400">
                    <tr>
                      <th className="p-3">ID / Data</th>
                      <th className="p-3">Nome / Contato</th>
                      <th className="p-3">Imóvel / Condomínio</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Indicador</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-500">
                          Nenhuma indicação encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((r) => {
                        const stalled = isStalled(r)
                        return (
                          <tr key={r.id} className="hover:bg-stone-800/30 transition-colors">
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-mono text-stone-300">
                                #{r.id.substring(0, 6)}
                              </span>
                              <div className="text-[11px] text-stone-500">
                                {new Date(r.created).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-stone-200">
                                {r.owner_name || r.buyer_name || r.referrer_name}
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {r.owner_phone || r.buyer_phone || r.referrer_phone}
                              </div>
                            </td>
                            <td className="p-3">
                              {r.expand?.condominium_id ? (
                                <span className="text-amber-300">
                                  {r.expand.condominium_id.name}
                                  {r.unit ? ` (${r.unit})` : ''}
                                </span>
                              ) : (
                                <span className="text-stone-500">Não informado</span>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="rounded-none border-stone-700 text-stone-300 text-[10px]"
                                >
                                  {r.status}
                                </Badge>
                                {stalled && (
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] rounded-none">
                                    Parada
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-stone-300">
                              {r.expand?.current_owner_id?.name || r.referrer_name || 'Sistema'}
                            </td>
                            <td className="p-3 text-stone-400">
                              {r.expand?.assigned_operator_id?.name || 'Não atribuído'}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="rounded-none text-xs text-amber-400 hover:text-amber-300"
                              >
                                <Link to={`/admin/indicacoes/${r.id}`}>
                                  Abrir
                                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Tabs>
      </main>
    </div>
  )
}
