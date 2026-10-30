import React, { useState, useEffect } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Upload,
  Calendar,
  Layers,
  FileCheck,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  listRewards,
  approveReward,
  registerRewardPayment,
  registerCommissionReceived,
  resolveRelatedIndicators,
  Reward,
} from '@/services/rewards'

type TabState =
  | 'todos'
  | 'aguardando_comissao'
  | 'em_analise'
  | 'em_revisao_admin'
  | 'pendente_dados'
  | 'aprovada'
  | 'em_lote'
  | 'paga'
  | 'cancelada'

export function AdminRewardsPage() {
  const { roles, isAdmin, isFinance } = useAuth()
  const { toast } = useToast()
  const isFinanceiro = isFinance || roles.includes('financeiro')
  const canApproveOrPay = isAdmin || isFinanceiro

  const [activeTab, setActiveTab] = useState<TabState>('em_analise')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  // Modais de ação
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [justification, setJustification] = useState('')
  const [approving, setApproving] = useState(false)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().substring(0, 10))
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [paying, setPaying] = useState(false)

  // Modal registrar comissão
  const [commissionModalOpen, setCommissionModalOpen] = useState(false)
  const [commissionDealId, setCommissionDealId] = useState('')
  const [commissionDate, setCommissionDate] = useState(new Date().toISOString().substring(0, 10))
  const [commissionValue, setCommissionValue] = useState('')
  const [submittingCommission, setSubmittingCommission] = useState(false)

  // Modal indicador laranja
  const [orangeModalOpen, setOrangeModalOpen] = useState(false)
  const [orangeDealId, setOrangeDealId] = useState('')
  const [orangeDecision, setOrangeDecision] = useState<
    'confirmar_independencia' | 'aplicar_indicador_unico'
  >('confirmar_independencia')
  const [orangeReason, setOrangeReason] = useState('')
  const [resolvingOrange, setResolvingOrange] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await listRewards()
      setRewards(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar recompensas',
        description: err?.message || 'Falha ao buscar dados do servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRewards = rewards.filter((r) => {
    if (activeTab === 'todos') return true
    return r.status === activeTab
  })

  // Abertura do modal de aprovação
  const handleOpenApprove = (r: Reward) => {
    setSelectedReward(r)
    setJustification('')
    setApproveModalOpen(true)
  }

  const handleConfirmApprove = async () => {
    if (!selectedReward) return
    if (!justification.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa para aprovar a recompensa.',
        variant: 'destructive',
      })
      return
    }

    try {
      setApproving(true)
      await approveReward(selectedReward.id, justification.trim())
      toast({
        title: 'Recompensa aprovada',
        description: 'A recompensa foi aprovada e estará disponível para inclusão no próximo lote.',
      })
      setApproveModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar',
        description: err?.data?.message || err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setApproving(false)
    }
  }

  // Abertura do modal de pagamento
  const handleOpenPayment = (r: Reward) => {
    setSelectedReward(r)
    setPaymentMethod('pix')
    setPaidAt(new Date().toISOString().substring(0, 10))
    setPaymentRef('')
    setPaymentNotes('')
    setProofFile(null)
    setPaymentModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedReward) return
    if (!proofFile && !selectedReward.payment_proof_file) {
      toast({
        title: 'Comprovante obrigatório',
        description: 'Faça o upload do comprovante de pagamento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setPaying(true)
      await registerRewardPayment(
        selectedReward.id,
        paymentMethod,
        paidAt,
        proofFile as File,
        paymentRef.trim(),
        paymentNotes.trim(),
      )
      toast({
        title: 'Pagamento registrado',
        description: 'O pagamento foi liquidado com sucesso e comprovante armazenado.',
      })
      setPaymentModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: err?.data?.message || err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setPaying(false)
    }
  }

  // Registrar comissão recebida
  const handleConfirmCommission = async () => {
    if (!commissionDealId || !commissionValue) {
      toast({
        title: 'Campos incompletos',
        description: 'Informe o ID do negócio e o valor recebido.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmittingCommission(true)
      const res: any = await registerCommissionReceived(
        commissionDealId,
        commissionDate,
        Number(commissionValue),
      )
      toast({
        title: 'Comissão registrada',
        description: res?.message || 'Valores ajustados com teto e recompensas atualizadas.',
      })
      setCommissionModalOpen(false)
      setCommissionDealId('')
      setCommissionValue('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar comissão',
        description: err?.data?.message || err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingCommission(false)
    }
  }

  // Resolver indicador laranja
  const handleConfirmOrange = async () => {
    if (!orangeDealId || !orangeReason.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Informe o ID do negócio e o motivo da decisão.',
        variant: 'destructive',
      })
      return
    }

    try {
      setResolvingOrange(true)
      await resolveRelatedIndicators(orangeDealId, orangeDecision, orangeReason.trim())
      toast({
        title: 'Decisão registrada',
        description: 'Alerta resolvido com sucesso pelo administrador.',
      })
      setOrangeModalOpen(false)
      setOrangeDealId('')
      setOrangeReason('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao resolver indicador',
        description: err?.data?.message || err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setResolvingOrange(false)
    }
  }

  // Helpers de contagem por status
  const countByStatus = (st: TabState) => {
    if (st === 'todos') return rewards.length
    return rewards.filter((r) => r.status === st).length
  }

  const getStatusBadge = (st: Reward['status']) => {
    switch (st) {
      case 'aguardando_comissao':
        return (
          <Badge className="bg-amber-950 text-amber-300 border-amber-800">
            Aguardando Comissão
          </Badge>
        )
      case 'em_analise':
        return <Badge className="bg-blue-950 text-blue-300 border-blue-800">Em Análise</Badge>
      case 'em_revisao_admin':
        return (
          <Badge className="bg-rose-950 text-rose-300 border-rose-800 animate-pulse">
            Revisão Admin (Laranja)
          </Badge>
        )
      case 'pendente_dados':
        return (
          <Badge className="bg-purple-950 text-purple-300 border-purple-800">
            Pendente Dados (CPF/Pix)
          </Badge>
        )
      case 'aprovada':
        return (
          <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800">Aprovada</Badge>
        )
      case 'em_lote':
        return <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800">Em Lote do Mês</Badge>
      case 'paga':
        return <Badge className="bg-emerald-900 text-white border-emerald-600">Paga</Badge>
      case 'cancelada':
        return <Badge className="bg-stone-900 text-stone-500 border-stone-800">Cancelada</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Financeiro & Recompensas
            </span>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
              <h1 className="text-xl font-bold font-serif tracking-tight text-foreground">
                Gestão de Recompensas e Pagamentos
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Fila operacional por estado, aprovações com conformidade financeira e liquidação de
              comprovantes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canApproveOrPay && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-[1px] font-heading"
                onClick={() => setCommissionModalOpen(true)}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Registrar Comissão
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-xs rounded-[1px] text-destructive hover:bg-destructive/10 font-heading"
                onClick={() => setOrangeModalOpen(true)}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Resolver Indicador Laranja
              </Button>
            )}
          </div>
        </div>

        {/* Abas / Filtro por Estado */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-2 text-xs font-heading">
          {[
            { id: 'em_analise', label: 'Em Análise' },
            { id: 'aguardando_comissao', label: 'Aguardando Comissão' },
            { id: 'em_revisao_admin', label: 'Revisão Admin' },
            { id: 'pendente_dados', label: 'Pendente Dados' },
            { id: 'aprovada', label: 'Aprovadas' },
            { id: 'em_lote', label: 'Em Lote' },
            { id: 'paga', label: 'Pagas' },
            { id: 'cancelada', label: 'Canceladas' },
            { id: 'todos', label: 'Todas' },
          ].map((tab) => {
            const count = countByStatus(tab.id as TabState)
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabState)}
                className={`px-3 py-1.5 whitespace-nowrap uppercase tracking-nav transition-colors flex items-center gap-1.5 rounded-[1px] ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-foreground text-background font-bold'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Lista de Recompensas */}
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Carregando recompensas...</div>
        ) : filteredRewards.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
            Nenhuma recompensa encontrada nesta fila.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRewards.map((rew) => {
              const rule = rew.expand?.rule_id
              const isRuleReleased = !!rule?.released_for_use
              const participant = rew.expand?.participant_id
              const referral = rew.expand?.referral_id
              const userObj = participant?.expand?.user_id

              return (
                <Card
                  key={rew.id}
                  className="bg-stone-900/60 border-stone-800/80 rounded-none hover:border-stone-700 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(rew.status)}
                        <Badge className="bg-stone-800 text-stone-300 text-[10px] uppercase rounded-none">
                          Marco: {rew.milestone}
                        </Badge>
                        <Badge className="bg-stone-800 text-stone-300 text-[10px] uppercase rounded-none">
                          {rew.beneficiary_type}
                        </Badge>
                        {rew.via_decline && (
                          <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px] rounded-none">
                            Via Declínio Godoy
                          </Badge>
                        )}
                        {!isRuleReleased && (
                          <Badge className="bg-amber-950/70 text-amber-400 border-amber-800/60 text-[10px] rounded-none flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Regra Não Liberada (Draft)
                          </Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-stone-400 mr-2">Valor Final:</span>
                        <span className="text-base font-mono font-bold text-emerald-400">
                          R${' '}
                          {Number(rew.final_amount_brl || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Beneficiário */}
                      <div className="space-y-1 bg-stone-950/50 p-2.5 border border-stone-800/50">
                        <div className="text-[10px] font-semibold text-stone-400 flex items-center gap-1 uppercase">
                          <User className="w-3 h-3 text-amber-500" /> Beneficiário
                        </div>
                        <div className="font-medium text-stone-200">
                          {userObj?.name || referral?.referrer_name || 'Participante'}
                        </div>
                        <div className="text-stone-400 text-[11px]">
                          CPF:{' '}
                          {participant?.cpf || (
                            <span className="text-amber-400">Não informado</span>
                          )}
                        </div>
                        <div className="text-stone-400 text-[11px]">
                          Pix:{' '}
                          {participant?.pix_key || (
                            <span className="text-amber-400">Não informada</span>
                          )}
                        </div>
                      </div>

                      {/* Indicação / Imóvel */}
                      <div className="space-y-1 bg-stone-950/50 p-2.5 border border-stone-800/50">
                        <div className="text-[10px] font-semibold text-stone-400 flex items-center gap-1 uppercase">
                          <Building className="w-3 h-3 text-amber-500" /> Indicação Vinculada
                        </div>
                        <div className="font-medium text-stone-200">
                          {referral?.expand?.condominium_id?.name || 'Condomínio não informado'}
                        </div>
                        <div className="text-stone-400 text-[11px]">
                          Tipo: {referral?.referral_type || referral?.type || '-'}
                        </div>
                        <div className="text-stone-400 text-[11px] font-mono">
                          ID: #{rew.referral_id?.substring(0, 8)}
                        </div>
                      </div>

                      {/* Regra & Ajustes */}
                      <div className="space-y-1 bg-stone-950/50 p-2.5 border border-stone-800/50">
                        <div className="text-[10px] font-semibold text-stone-400 flex items-center gap-1 uppercase">
                          <Coins className="w-3 h-3 text-amber-500" /> Regra & Conformidade
                        </div>
                        <div className="text-stone-300 text-[11px]">
                          Cálculo Base:{' '}
                          <span className="font-mono">
                            R${' '}
                            {Number(rew.calculated_amount_brl || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {rew.adjustment_reason && (
                          <div className="text-amber-300 text-[11px] italic">
                            Motivo Ajuste: {rew.adjustment_reason}
                          </div>
                        )}
                        {rew.orange_flag_reason && (
                          <div className="text-rose-400 text-[11px] font-semibold">
                            {rew.orange_flag_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações da Recompensa */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-800/60 text-xs">
                      <div className="text-[11px] text-stone-400">
                        {rew.approved_at && (
                          <span>
                            Aprovada em {new Date(rew.approved_at).toLocaleDateString('pt-BR')}
                            {rew.approval_justification && ` — "${rew.approval_justification}"`}
                          </span>
                        )}
                        {rew.paid_at && (
                          <span className="ml-2 text-emerald-400">
                            Paga via {rew.payment_method?.toUpperCase()} em{' '}
                            {new Date(rew.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botão de Aprovação */}
                        {rew.status === 'em_analise' && (
                          <Button
                            size="sm"
                            disabled={!canApproveOrPay || !isRuleReleased}
                            onClick={() => handleOpenApprove(rew)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold text-xs rounded-none h-7 px-3 disabled:opacity-40"
                            title={
                              !isRuleReleased
                                ? 'Regra não liberada para uso (released_for_use = false)'
                                : ''
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Aprovar
                          </Button>
                        )}

                        {/* Botão Registrar Pagamento */}
                        {(rew.status === 'aprovada' || rew.status === 'em_lote') && (
                          <Button
                            size="sm"
                            disabled={!canApproveOrPay}
                            onClick={() => handleOpenPayment(rew)}
                            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-none h-7 px-3"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal de Aprovação */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aprovar Recompensa
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                A aprovação exige conformidade e justificativa formal de auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-stone-950 p-3 border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Valor Final:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    R${' '}
                    {Number(selectedReward?.final_amount_brl || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Beneficiário:</span>
                  <span className="text-stone-200">
                    {selectedReward?.expand?.participant_id?.expand?.user_id?.name ||
                      'Participante'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">
                  Justificativa de Aprovação (Obrigatória)
                </Label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Documentação conferida, matrícula validada e conformidade aprovada pelo financeiro."
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={approving || !justification.trim()}
                onClick={handleConfirmApprove}
                className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold rounded-none text-xs"
              >
                {approving ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Pagamento */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Registrar Pagamento de Recompensa
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Exige método, data e comprovante emitido pela instituição pagadora.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Método de Pagamento</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  <option value="pix">Pix</option>
                  <option value="transferencia">Transferência Bancária (TED/DOC)</option>
                  <option value="cartao_premiacao">Cartão de Premiação</option>
                  <option value="cartao_presente">Cartão-Presente</option>
                  <option value="benfeitoria">Benfeitoria em Condomínio</option>
                  <option value="desconto_comissao">Desconto na Comissão</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">
                  Comprovante de Pagamento (Upload Obrigatório)
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Referência / Código da Transação</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ex: E2E123456789..."
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Observações</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notas internas..."
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={paying || (!proofFile && !selectedReward?.payment_proof_file)}
                onClick={handleConfirmPayment}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
              >
                {paying ? 'Salvando...' : 'Registrar Pagamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Comissão Recebida */}
        <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Registrar Comissão Recebida do Negócio
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Aplica o teto de 10% por lado sobre o valor recebido e move para Em Análise ou
                Alerta Laranja.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">ID do Negócio (Deal ID)</Label>
                <Input
                  value={commissionDealId}
                  onChange={(e) => setCommissionDealId(e.target.value)}
                  placeholder="ID da tabela deals"
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Data de Recebimento da Comissão</Label>
                <Input
                  type="date"
                  value={commissionDate}
                  onChange={(e) => setCommissionDate(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Valor da Comissão Recebida (R$)</Label>
                <Input
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder="Ex: 60000"
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommissionModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={submittingCommission || !commissionDealId || !commissionValue}
                onClick={handleConfirmCommission}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
              >
                {submittingCommission ? 'Processando...' : 'Aplicar e Calcular'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Resolver Indicador Laranja */}
        <Dialog open={orangeModalOpen} onOpenChange={setOrangeModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                Decisão de Indicador Laranja (Admin)
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Confirmação de independência entre indicadores coincidentes ou aplicação da regra de
                indicador único.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">ID do Negócio (Deal ID)</Label>
                <Input
                  value={orangeDealId}
                  onChange={(e) => setOrangeDealId(e.target.value)}
                  placeholder="ID do negócio em revisão"
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Decisão</Label>
                <select
                  value={orangeDecision}
                  onChange={(e) => setOrangeDecision(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  <option value="confirmar_independencia">
                    Confirmar Independência (Libera os dois)
                  </option>
                  <option value="aplicar_indicador_unico">
                    Aplicar Indicador Único (Mantém só o maior)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Motivo / Parecer do Administrador</Label>
                <Textarea
                  value={orangeReason}
                  onChange={(e) => setOrangeReason(e.target.value)}
                  placeholder="Parecer formal detalhando o motivo da decisão..."
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrangeModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={resolvingOrange || !orangeDealId || !orangeReason.trim()}
                onClick={handleConfirmOrange}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-none text-xs"
              >
                {resolvingOrange ? 'Salvando...' : 'Registrar Decisão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
export default AdminRewardsPage
