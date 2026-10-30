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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Operação de Pipeline
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold">
              Gestão de Indicações & Funis
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Kanban e listagem dos funis de Captação de Proprietários e Atendimento de Compradores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-[1px] text-xs font-heading"
            >
              <KanbanIcon className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-[1px] text-xs font-heading"
            >
              <ListIcon className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
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
          <TabsList className="bg-secondary border border-border rounded-[1px] p-1 font-heading text-xs">
            <TabsTrigger
              value="proprietarios"
              className="rounded-[1px] text-xs uppercase tracking-nav data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
            >
              <Building className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              Proprietários (Captação)
            </TabsTrigger>
            <TabsTrigger
              value="compradores"
              className="rounded-[1px] text-xs uppercase tracking-nav data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
            >
              <User className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              Compradores & Interessados
            </TabsTrigger>
          </TabsList>

          {/* Filters Bar */}
          <div className="bg-card border border-border p-4 space-y-3 rounded-[1px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" strokeWidth={1.5} />
                <Input
                  placeholder="Buscar nome, condomínio, unidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-background border-border pl-9 rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="bg-background border-border rounded-[1px] text-xs font-heading">
                    <SelectValue placeholder="Todas as Etapas" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-[1px]">
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
                  <SelectTrigger className="bg-background border-border rounded-[1px] text-xs font-heading">
                    <SelectValue placeholder="Todos os Condomínios" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-[1px]">
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
                  <SelectTrigger className="bg-background border-border rounded-[1px] text-xs font-heading">
                    <SelectValue placeholder="Responsável (Operador)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-[1px]">
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
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer font-sans">
                <input
                  type="checkbox"
                  checked={onlyStalled}
                  onChange={(e) => setOnlyStalled(e.target.checked)}
                  className="rounded-[1px] border-border bg-background text-primary"
                />
                <span className="flex items-center gap-1 text-warning font-heading font-medium">
                  <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Mostrar apenas indicações paradas (&gt;5 dias em triagem ou &gt;10 dias ativas)
                </span>
              </label>

              <span className="text-xs text-muted-foreground font-sans">
                Total filtrado: <strong className="text-foreground font-mono">{filteredReferrals.length}</strong> indicações
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center text-muted-foreground text-sm font-sans">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" strokeWidth={1.5} />
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
                    className="w-72 shrink-0 bg-card border border-border flex flex-col max-h-[750px] rounded-[1px]"
                  >
                    {/* Header */}
                    <div className="p-3 border-b border-border bg-secondary/60 flex justify-between items-center sticky top-0 z-10 font-heading">
                      <span className="text-xs font-semibold text-foreground tracking-wide uppercase">{stage.label}</span>
                      <Badge
                        variant="outline"
                        className="rounded-[1px] border-border text-muted-foreground text-[10px] font-mono"
                      >
                        {stageRefs.length}
                      </Badge>
                    </div>

                    {/* Cards list */}
                    <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                      {stageRefs.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-xs italic font-sans">Vazio</div>
                      ) : (
                        stageRefs.map((r) => {
                          const stalled = isStalled(r)
                          return (
                            <Link
                              key={r.id}
                              to={`/admin/indicacoes/${r.id}`}
                              className={`block p-3 bg-card border transition-colors hover:border-gold-deep rounded-[1px] shadow-subtle ${
                                stalled
                                  ? 'border-warning/60 bg-warning/5'
                                  : 'border-border'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[11px] font-semibold text-foreground line-clamp-1 font-serif">
                                  {r.owner_name || r.buyer_name || r.referrer_name || 'Sem nome'}
                                </span>
                                {stalled && (
                                  <Badge className="bg-warning/20 text-warning border-warning/40 text-[9px] px-1 py-0 rounded-[1px] shrink-0 font-mono">
                                    Parada
                                  </Badge>
                                )}
                              </div>

                              {(r.expand?.condominium_id || r.unit) && (
                                <p className="text-[11px] text-gold-deep mt-1 line-clamp-1 flex items-center gap-1 font-heading">
                                  <Building className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                                  {r.expand?.condominium_id?.name || 'Condomínio'}
                                  {r.unit ? ` - ${r.unit}` : ''}
                                </p>
                              )}

                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 font-sans">
                                {r.description}
                              </p>

                              <div className="mt-2.5 pt-2 border-t border-border/60 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
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
            <div className="bg-card border border-border overflow-hidden rounded-[1px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
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
                  <tbody className="divide-y divide-border/60">
                    {filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-sans">
                          Nenhuma indicação encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((r, index) => {
                        const stalled = isStalled(r)
                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-accent/40 transition-colors ${
                              index % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                            }`}
                          >
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-mono text-foreground font-medium">
                                #{r.id.substring(0, 6)}
                              </span>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {new Date(r.created).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-foreground">
                                {r.owner_name || r.buyer_name || r.referrer_name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {r.owner_phone || r.buyer_phone || r.referrer_phone}
                              </div>
                            </td>
                            <td className="p-3">
                              {r.expand?.condominium_id ? (
                                <span className="text-gold-deep font-heading">
                                  {r.expand.condominium_id.name}
                                  {r.unit ? ` (${r.unit})` : ''}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Não informado</span>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="rounded-[1px] border-border text-foreground text-[10px] font-mono"
                                >
                                  {r.status}
                                </Badge>
                                {stalled && (
                                  <Badge className="bg-warning/20 text-warning border-warning/40 text-[9px] rounded-[1px] font-mono">
                                    Parada
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-foreground font-sans">
                              {r.expand?.current_owner_id?.name || r.referrer_name || 'Sistema'}
                            </td>
                            <td className="p-3 text-muted-foreground font-sans">
                              {r.expand?.assigned_operator_id?.name || 'Não atribuído'}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="rounded-[1px] text-xs text-gold-deep hover:text-gold-deep/80 font-heading"
                              >
                                <Link to={`/admin/indicacoes/${r.id}`}>
                                  Abrir
                                  <ChevronRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
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
