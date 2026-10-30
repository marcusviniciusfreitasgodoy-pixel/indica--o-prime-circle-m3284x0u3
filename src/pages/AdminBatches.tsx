import React, { useState, useEffect } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Layers,
  Calendar,
  Lock,
  Coins,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Upload,
  User,
  Building,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  listPaymentBatches,
  buildPaymentBatch,
  closePaymentBatch,
  registerRewardPayment,
  PaymentBatch,
  Reward,
} from '@/services/rewards'

export function AdminBatchesPage() {
  const { roles, isAdmin, isFinance } = useAuth()
  const { toast } = useToast()
  const isFinanceiro = isFinance || roles.includes('financeiro')
  const canManage = isAdmin || isFinanceiro

  const [batches, setBatches] = useState<PaymentBatch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null)
  const [batchItems, setBatchItems] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)

  // Modal Gerar/Atualizar Lote
  const [buildModalOpen, setBuildModalOpen] = useState(false)
  const [monthRef, setMonthRef] = useState(new Date().toISOString().substring(0, 7))
  const [building, setBuilding] = useState(false)

  // Modal Registrar Pagamento de Item do Lote
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Reward | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().substring(0, 10))
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [paying, setPaying] = useState(false)

  // Fechar lote
  const [closing, setClosing] = useState(false)

  const loadBatches = async () => {
    try {
      setLoading(true)
      const data = await listPaymentBatches()
      setBatches(data)
      if (data.length > 0 && !selectedBatch) {
        handleSelectBatch(data[0])
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar lotes',
        description: err?.message || 'Falha ao buscar lotes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBatch = async (batch: PaymentBatch) => {
    setSelectedBatch(batch)
    try {
      setLoadingItems(true)
      const items = await pb.collection('rewards').getFullList<Reward>({
        filter: `batch_id = '${batch.id}'`,
        sort: '-final_amount_brl',
        expand:
          'referral_id,referral_id.condominium_id,participant_id,participant_id.user_id,rule_id',
      })
      setBatchItems(items)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar itens do lote',
        description: err?.message || 'Falha ao buscar itens.',
        variant: 'destructive',
      })
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    loadBatches()
  }, [])

  const handleBuildBatch = async () => {
    try {
      setBuilding(true)
      const res: any = await buildPaymentBatch(monthRef)
      toast({
        title: 'Lote processado',
        description: res?.message || 'Recompensas aprovadas foram adicionadas ao lote.',
      })
      setBuildModalOpen(false)
      loadBatches()
    } catch (err: any) {
      toast({
        title: 'Erro ao montar lote',
        description: err?.data?.message || err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setBuilding(false)
    }
  }

  const handleOpenItemPayment = (item: Reward) => {
    setSelectedItem(item)
    setPaymentMethod('pix')
    setPaidAt(new Date().toISOString().substring(0, 10))
    setPaymentRef('')
    setPaymentNotes('')
    setProofFile(null)
    setPaymentModalOpen(true)
  }

  const handleConfirmItemPayment = async () => {
    if (!selectedItem) return
    if (!proofFile && !selectedItem.payment_proof_file) {
      toast({
        title: 'Comprovante obrigatório',
        description: 'Faça upload do comprovante de pagamento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setPaying(true)
      await registerRewardPayment(
        selectedItem.id,
        paymentMethod,
        paidAt,
        proofFile as File,
        paymentRef.trim(),
        paymentNotes.trim(),
      )
      toast({
        title: 'Pagamento registrado',
        description: 'Item liquidado e comprovante salvo.',
      })
      setPaymentModalOpen(false)
      if (selectedBatch) handleSelectBatch(selectedBatch)
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

  const handleCloseBatch = async () => {
    if (!selectedBatch) return
    try {
      setClosing(true)
      await closePaymentBatch(selectedBatch.id)
      toast({
        title: 'Lote fechado com sucesso',
        description: 'Todos os itens foram conferidos e comprovantes validados.',
      })
      loadBatches()
    } catch (err: any) {
      toast({
        title: 'Não foi possível fechar o lote',
        description: err?.data?.message || err?.message || 'Falha ao fechar lote.',
        variant: 'destructive',
      })
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Liquidação Financeira
            </span>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
              <h1 className="text-xl font-bold font-serif tracking-tight text-foreground">
                Lotes Mensais de Pagamento
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              Apuração mensal das recompensas aprovadas, liquidação bancária e fechamento com
              comprovantes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                size="sm"
                onClick={() => setBuildModalOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs rounded-[1px] font-heading"
              >
                <Calendar className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                Montar / Atualizar Lote do Mês
              </Button>
            )}
          </div>
        </div>

        {/* Layout: Lista de Lotes na Esquerda, Detalhes na Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Lotes */}
          <div className="space-y-3 font-sans">
            <h2 className="text-xs font-semibold uppercase tracking-label font-heading text-muted-foreground">
              Lotes Cadastrados ({batches.length})
            </h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-sans">
                Carregando lotes...
              </div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border text-muted-foreground text-xs rounded-[1px] font-sans">
                Nenhum lote gerado ainda. Clique em "Montar Lote do Mês" para iniciar.
              </div>
            ) : (
              batches.map((b) => {
                const isSelected = selectedBatch?.id === b.id
                return (
                  <Card
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className={`cursor-pointer transition-all rounded-[1px] border ${
                      isSelected
                        ? 'bg-card border-gold-deep shadow-subtle'
                        : 'bg-card border-border hover:border-gold-deep/60'
                    }`}
                  >
                    <CardContent className="p-4 space-y-2 text-xs font-sans">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {b.month_ref}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded-[1px] font-heading ${
                            b.status === 'fechado'
                              ? 'border-border text-muted-foreground bg-secondary'
                              : 'border-success/30 text-success bg-success/10'
                          }`}
                        >
                          {b.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>
                          Itens:{' '}
                          <strong className="font-mono text-foreground">{b.item_count}</strong>
                        </span>
                        <span className="font-mono font-semibold text-gold-deep">
                          R${' '}
                          {Number(b.total_amount_brl || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border font-mono">
                        Vencimento:{' '}
                        {b.due_date
                          ? new Date(b.due_date).toLocaleDateString('pt-BR')
                          : 'Não definido'}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Coluna Detalhes do Lote Selecionado */}
          <div className="lg:col-span-2 space-y-4 font-sans">
            {selectedBatch ? (
              <>
                <Card className="bg-card border-border rounded-[1px] shadow-subtle">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-foreground font-mono font-semibold">
                            Lote {selectedBatch.month_ref}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="text-foreground border-border text-[10px] rounded-[1px] uppercase font-mono"
                          >
                            {selectedBatch.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5 font-sans">
                          Total acumulado:{' '}
                          <span className="font-mono text-gold-deep font-semibold">
                            R${' '}
                            {Number(selectedBatch.total_amount_brl || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>{' '}
                          em <span className="font-mono">{batchItems.length}</span> recompensas.
                        </CardDescription>
                      </div>

                      {canManage && selectedBatch.status !== 'fechado' && (
                        <Button
                          size="sm"
                          disabled={closing || batchItems.length === 0}
                          onClick={handleCloseBatch}
                          className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs rounded-[1px] h-8 font-heading"
                          title="Exige que todos os itens tenham comprovante anexado"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                          {closing ? 'Fechando...' : 'Fechar Lote'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4 text-xs font-sans">
                    <div className="text-[11px] font-semibold uppercase tracking-label text-muted-foreground font-heading">
                      Recompensas Incluídas neste Lote
                    </div>

                    {loadingItems ? (
                      <div className="p-12 text-center text-xs text-muted-foreground font-sans">
                        Carregando itens...
                      </div>
                    ) : batchItems.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border text-muted-foreground text-xs rounded-[1px] font-sans">
                        Nenhuma recompensa incluída neste lote.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {batchItems.map((item) => {
                          const part = item.expand?.participant_id
                          const userObj = part?.expand?.user_id
                          const isPaid = item.status === 'paga'

                          return (
                            <div
                              key={item.id}
                              className="bg-secondary/40 p-3 border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs rounded-[1px]"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground font-sans">
                                    {userObj?.name || 'Participante'}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-border text-muted-foreground text-[10px] rounded-[1px] uppercase font-mono"
                                  >
                                    {item.milestone}
                                  </Badge>
                                  {isPaid ? (
                                    <Badge
                                      variant="outline"
                                      className="border-success/40 bg-success/10 text-success text-[10px] rounded-[1px] flex items-center gap-1 font-heading"
                                    >
                                      <CheckCircle2
                                        className="w-3 h-3 text-success"
                                        strokeWidth={1.5}
                                      />{' '}
                                      Pago
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-warning/40 bg-warning/10 text-warning text-[10px] rounded-[1px] font-heading"
                                    >
                                      Pendente Liquidação
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-[11px] text-muted-foreground font-mono">
                                  Pix: {part?.pix_key || 'Não informado'} | CPF:{' '}
                                  {part?.cpf || 'Não informado'}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-mono font-bold text-sm text-gold-deep">
                                    R${' '}
                                    {Number(item.final_amount_brl || 0).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>

                                {canManage && selectedBatch.status !== 'fechado' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenItemPayment(item)}
                                    variant="outline"
                                    className="border-border hover:bg-secondary text-foreground font-semibold text-xs rounded-[1px] h-7 px-2.5 font-heading"
                                  >
                                    <Upload className="w-3 h-3 mr-1" strokeWidth={1.5} />
                                    {isPaid ? 'Atualizar Comprovante' : 'Liquidar'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="p-12 text-center border border-dashed border-border text-muted-foreground text-xs rounded-[1px] font-sans">
                Selecione um lote ao lado para conferir os itens.
              </div>
            )}
          </div>
        </div>

        {/* Modal Montar Lote */}
        <Dialog open={buildModalOpen} onOpenChange={setBuildModalOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                Montar ou Atualizar Lote do Mês
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Coleta todas as recompensas em status 'Aprovada' e adiciona ao lote do mês de
                apuração.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Mês de Referência (YYYY-MM)
                </Label>
                <Input
                  type="month"
                  value={monthRef}
                  onChange={(e) => setMonthRef(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuildModalOpen(false)}
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={building || !monthRef}
                onClick={handleBuildBatch}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold rounded-[1px] text-xs font-heading"
              >
                {building ? 'Montando...' : 'Montar Lote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Liquidar Item do Lote */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground font-serif font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                Liquidar Recompensa do Lote
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                O lote não fecha com item sem comprovante anexado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs font-sans">
              <div className="bg-secondary/50 p-3 border border-border space-y-1 rounded-[1px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Final:</span>
                  <span className="font-mono font-bold text-gold-deep">
                    R${' '}
                    {Number(selectedItem?.final_amount_brl || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participante:</span>
                  <span className="text-foreground font-medium">
                    {selectedItem?.expand?.participant_id?.expand?.user_id?.name || 'Participante'}
                  </span>
                </div>
              </div>

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
                  Comprovante de Pagamento (Upload)
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="bg-background border-border rounded-[1px] text-xs cursor-pointer text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Código da Transação
                </Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ex: Pix E2E..."
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
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
                disabled={paying || (!proofFile && !selectedItem?.payment_proof_file)}
                onClick={handleConfirmItemPayment}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold rounded-[1px] text-xs font-heading"
              >
                {paying ? 'Salvando...' : 'Salvar Pagamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
export default AdminBatchesPage
