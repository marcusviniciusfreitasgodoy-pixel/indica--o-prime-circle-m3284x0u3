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
          <Badge
            variant="outline"
            className="border-warning/40 bg-warning/10 text-warning rounded-[1px] font-heading text-[10px]"
          >
            Aguardando Comissão
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge
            variant="outline"
            className="border-info/40 bg-info/10 text-info rounded-[1px] font-heading text-[10px]"
          >
            Em Análise
          </Badge>
        )
      case 'em_revisao_admin':
        return (
          <Badge
            variant="outline"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-[1px] font-heading text-[10px]"
          >
            Revisão Admin (Laranja)
          </Badge>
        )
      case 'pendente_dados':
        return (
          <Badge
            variant="outline"
            className="border-border bg-secondary text-gold-deep rounded-[1px] font-heading text-[10px]"
          >
            Pendente Dados (CPF/Pix)
          </Badge>
        )
      case 'aprovada':
        return (
          <Badge
            variant="outline"
            className="border-success/40 bg-success/10 text-success rounded-[1px] font-heading text-[10px]"
          >
            Aprovada
          </Badge>
        )
      case 'em_lote':
        return (
          <Badge
            variant="outline"
            className="border-info/40 bg-info/10 text-info rounded-[1px] font-heading text-[10px]"
          >
            Em Lote do Mês
          </Badge>
        )
      case 'paga':
        return (
          <Badge
            variant="outline"
            className="border-success/60 bg-success/20 text-success rounded-[1px] font-heading text-[10px]"
          >
            Paga
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge
            variant="outline"
            className="border-border bg-background text-muted-foreground rounded-[1px] font-heading text-[10px]"
          >
            Cancelada
          </Badge>
        )
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
          <div className="p-12 text-center text-xs text-muted-foreground font-sans">
            Carregando recompensas...
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border text-muted-foreground text-xs rounded-[1px] font-sans">
            Nenhuma recompensa encontrada nesta fila.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 font-sans">
            {filteredRewards.map((rew) => {
              const rule = rew.expand?.rule_id
              const isRuleReleased = !!rule?.released_for_use
              const participant = rew.expand?.participant_id
              const referral = rew.expand?.referral_id
              const userObj = participant?.expand?.user_id

              return (
                <Card
                  key={rew.id}
                  className="bg-card border-border rounded-[1px] hover:border-gold-deep/60 transition-colors shadow-subtle"
                >
                  <CardContent className="p-4 space-y-3 font-sans">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border pb-3">
                      <div className="flex items-center gap-2 flex-wrap font-heading">
                        {getStatusBadge(rew.status)}
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground text-[10px] uppercase rounded-[1px] font-mono"
                        >
                          Marco: {rew.milestone}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border text-foreground text-[10px] uppercase rounded-[1px]"
                        >
                          {rew.beneficiary_type}
                        </Badge>
                        {rew.via_decline && (
                          <Badge
                            variant="outline"
                            className="border-destructive/40 bg-destructive/10 text-destructive text-[10px] rounded-[1px]"
                          >
                            Via Declínio Godoy
                          </Badge>
                        )}
                        {!isRuleReleased && (
                          <Badge
                            variant="outline"
                            className="border-warning/40 bg-warning/10 text-warning text-[10px] rounded-[1px] flex items-center gap-1 font-heading"
                          >
                            <AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> Regra Não
                            Liberada (Draft)
                          </Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-2 font-sans">
                          Valor Final:
                        </span>
                        <span className="text-base font-mono font-bold text-gold-deep">
                          R${' '}
                          {Number(rew.final_amount_brl || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
                      {/* Beneficiário */}
                      <div className="space-y-1 bg-secondary/50 p-2.5 border border-border rounded-[1px]">
                        <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase font-heading tracking-label">
                          <User className="w-3 h-3 text-gold-deep" strokeWidth={1.5} /> Beneficiário
                        </div>
                        <div className="font-medium text-foreground">
                          {userObj?.name || referral?.referrer_name || 'Participante'}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-mono">
                          CPF:{' '}
                          {participant?.cpf || (
                            <span className="text-gold-deep">Não informado</span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-mono">
                          Pix:{' '}
                          {participant?.pix_key || (
                            <span className="text-gold-deep">Não informada</span>
                          )}
                        </div>
                      </div>

                      {/* Indicação / Imóvel */}
                      <div className="space-y-1 bg-secondary/50 p-2.5 border border-border rounded-[1px]">
                        <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase font-heading tracking-label">
                          <Building className="w-3 h-3 text-gold-deep" strokeWidth={1.5} />{' '}
                          Indicação Vinculada
                        </div>
                        <div className="font-medium text-foreground">
                          {referral?.expand?.condominium_id?.name || 'Condomínio não informado'}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-sans">
                          Tipo: {referral?.referral_type || referral?.type || '-'}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-mono">
                          ID: #{rew.referral_id?.substring(0, 8)}
                        </div>
                      </div>

                      {/* Regra & Ajustes */}
                      <div className="space-y-1 bg-secondary/50 p-2.5 border border-border rounded-[1px]">
                        <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase font-heading tracking-label">
                          <Coins className="w-3 h-3 text-gold-deep" strokeWidth={1.5} /> Regra &
                          Conformidade
                        </div>
                        <div className="text-foreground text-[11px]">
                          Cálculo Base:{' '}
                          <span className="font-mono text-gold-deep">
                            R${' '}
                            {Number(rew.calculated_amount_brl || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {rew.adjustment_reason && (
                          <div className="text-gold-deep text-[11px] italic">
                            Motivo Ajuste: {rew.adjustment_reason}
                          </div>
                        )}
                        {rew.orange_flag_reason && (
                          <div className="text-destructive text-[11px] font-semibold">
                            {rew.orange_flag_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações da Recompensa */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border text-xs">
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {rew.approved_at && (
                          <span>
                            Aprovada em {new Date(rew.approved_at).toLocaleDateString('pt-BR')}
                            {rew.approval_justification && ` — "${rew.approval_justification}"`}
                          </span>
                        )}
                        {rew.paid_at && (
                          <span className="ml-2 text-success">
                            Paga via {rew.payment_method?.toUpperCase()} em{' '}
                            {new Date(rew.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-heading">
                        {/* Botão de Aprovação */}
                        {rew.status === 'em_analise' && (
                          <Button
                            size="sm"
                            disabled={!canApproveOrPay || !isRuleReleased}
                            onClick={() => handleOpenApprove(rew)}
                            className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs rounded-[1px] h-7 px-3 disabled:opacity-40"
                            title={
                              !isRuleReleased
                                ? 'Regra não liberada para uso (released_for_use = false)'
                                : ''
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                            Aprovar
                          </Button>
                        )}

                        {/* Botão Registrar Pagamento */}
                        {(rew.status === 'aprovada' || rew.status === 'em_lote') && (
                          <Button
                            size="sm"
                            disabled={!canApproveOrPay}
                            onClick={() => handleOpenPayment(rew)}
                            variant="outline"
                            className="text-gold-deep border-border hover:bg-secondary text-xs rounded-[1px] h-7 px-3 font-semibold"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
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
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.5} />
                Aprovar Recompensa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                A aprovação exige conformidade e justificativa formal de auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="bg-secondary/50 p-3 border border-border space-y-1 rounded-[1px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Final:</span>
                  <span className="font-mono font-bold text-gold-deep">
                    R${' '}
                    {Number(selectedReward?.final_amount_brl || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beneficiário:</span>
                  <span className="text-foreground font-medium">
                    {selectedReward?.expand?.participant_id?.expand?.user_id?.name ||
                      'Participante'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Justificativa de Aprovação (Obrigatória)
                </Label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Documentação conferida, matrícula validada e conformidade aprovada pelo financeiro."
                  className="bg-background border-border rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={approving || !justification.trim()}
                onClick={handleConfirmApprove}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold rounded-[1px] text-xs font-heading"
              >
                {approving ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Pagamento */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                Registrar Pagamento de Recompensa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Exige método, data e comprovante emitido pela instituição pagadora.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Método de Pagamento
                </Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-[1px] px-3 py-2 text-xs text-foreground font-sans"
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
                <Label className="text-xs text-foreground font-heading font-medium">
                  Data do Pagamento
                </Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Comprovante de Pagamento (Upload Obrigatório)
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="bg-background border-border rounded-[1px] text-xs cursor-pointer text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Referência / Código da Transação
                </Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ex: E2E123456789..."
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Observações
                </Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notas internas..."
                  className="bg-background border-border rounded-[1px] text-xs text-foreground"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={paying || (!proofFile && !selectedReward?.payment_proof_file)}
                onClick={handleConfirmPayment}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold rounded-[1px] text-xs font-heading"
              >
                {paying ? 'Salvando...' : 'Registrar Pagamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Registrar Comissão Recebida */}
        <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                Registrar Comissão Recebida do Negócio
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Aplica o teto de 10% por lado sobre o valor recebido e move para Em Análise ou
                Alerta Laranja.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  ID do Negócio (Deal ID)
                </Label>
                <Input
                  value={commissionDealId}
                  onChange={(e) => setCommissionDealId(e.target.value)}
                  placeholder="ID da tabela deals"
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Data de Recebimento da Comissão
                </Label>
                <Input
                  type="date"
                  value={commissionDate}
                  onChange={(e) => setCommissionDate(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Valor da Comissão Recebida (R$)
                </Label>
                <Input
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder="Ex: 60000"
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommissionModalOpen(false)}
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={submittingCommission || !commissionDealId || !commissionValue}
                onClick={handleConfirmCommission}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold rounded-[1px] text-xs font-heading"
              >
                {submittingCommission ? 'Processando...' : 'Aplicar e Calcular'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Resolver Indicador Laranja */}
        <Dialog open={orangeModalOpen} onOpenChange={setOrangeModalOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                Decisão de Indicador Laranja (Admin)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Confirmação de independência entre indicadores coincidentes ou aplicação da regra de
                indicador único.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  ID do Negócio (Deal ID)
                </Label>
                <Input
                  value={orangeDealId}
                  onChange={(e) => setOrangeDealId(e.target.value)}
                  placeholder="ID do negócio em revisão"
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">Decisão</Label>
                <select
                  value={orangeDecision}
                  onChange={(e) => setOrangeDecision(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-[1px] px-3 py-2 text-xs text-foreground font-sans"
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
                <Label className="text-xs text-foreground font-heading font-medium">
                  Motivo / Parecer do Administrador
                </Label>
                <Textarea
                  value={orangeReason}
                  onChange={(e) => setOrangeReason(e.target.value)}
                  placeholder="Parecer formal detalhando o motivo da decisão..."
                  className="bg-background border-border rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrangeModalOpen(false)}
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={resolvingOrange || !orangeDealId || !orangeReason.trim()}
                onClick={handleConfirmOrange}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold rounded-[1px] text-xs font-heading"
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
