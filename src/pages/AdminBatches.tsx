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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">
                Lotes Mensais de Pagamento
              </h1>
            </div>
            <p className="text-xs text-stone-400">
              Apuração mensal das recompensas aprovadas, liquidação bancária e fechamento com
              comprovantes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                size="sm"
                onClick={() => setBuildModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-none"
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Montar / Atualizar Lote do Mês
              </Button>
            )}
          </div>
        </div>

        {/* Layout: Lista de Lotes na Esquerda, Detalhes na Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Lotes */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Lotes Cadastrados ({batches.length})
            </h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500">Carregando lotes...</div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
                Nenhum lote gerado ainda. Clique em "Montar Lote do Mês" para iniciar.
              </div>
            ) : (
              batches.map((b) => {
                const isSelected = selectedBatch?.id === b.id
                return (
                  <Card
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className={`cursor-pointer transition-all rounded-none border ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500/50 shadow-md shadow-amber-950/20'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <CardContent className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-white">
                          {b.month_ref}
                        </span>
                        <Badge
                          className={`text-[10px] rounded-none ${
                            b.status === 'fechado'
                              ? 'bg-stone-800 text-stone-400 border-stone-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {b.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex justify-between text-stone-400 text-[11px]">
                        <span>Itens: {b.item_count}</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          R${' '}
                          {Number(b.total_amount_brl || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-800">
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
          <div className="lg:col-span-2 space-y-4">
            {selectedBatch ? (
              <>
                <Card className="bg-stone-900/60 border-stone-800 rounded-none">
                  <CardHeader className="pb-3 border-b border-stone-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-white font-mono">
                            Lote {selectedBatch.month_ref}
                          </CardTitle>
                          <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                            {selectedBatch.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-stone-400 mt-0.5">
                          Total acumulado: R${' '}
                          {Number(selectedBatch.total_amount_brl || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          em {batchItems.length} recompensas.
                        </CardDescription>
                      </div>

                      {canManage && selectedBatch.status !== 'fechado' && (
                        <Button
                          size="sm"
                          disabled={closing || batchItems.length === 0}
                          onClick={handleCloseBatch}
                          className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold text-xs rounded-none h-8"
                          title="Exige que todos os itens tenham comprovante anexado"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1" />
                          {closing ? 'Fechando...' : 'Fechar Lote'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4 text-xs">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Recompensas Incluídas neste Lote
                    </div>

                    {loadingItems ? (
                      <div className="p-12 text-center text-xs text-stone-500">
                        Carregando itens...
                      </div>
                    ) : batchItems.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
                        Nenhuma recompensa incluída neste lote.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {batchItems.map((item) => {
                          const part = item.expand?.participant_id
                          const userObj = part?.expand?.user_id
                          const isPaid = item.status === 'paga'
                          const hasProof = !!item.payment_proof_file

                          return (
                            <div
                              key={item.id}
                              className="bg-stone-950/60 p-3 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-200">
                                    {userObj?.name || 'Participante'}
                                  </span>
                                  <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                                    {item.milestone}
                                  </Badge>
                                  {isPaid ? (
                                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] rounded-none flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Pago
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] rounded-none">
                                      Pendente Liquidação
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-[11px] text-stone-400">
                                  Pix: {part?.pix_key || 'Não informado'} | CPF:{' '}
                                  {part?.cpf || 'Não informado'}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-mono font-bold text-sm text-emerald-400">
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
                                    className="bg-stone-900 border border-stone-700 hover:bg-stone-800 text-stone-200 font-semibold text-xs rounded-none h-7 px-2.5"
                                  >
                                    <Upload className="w-3 h-3 mr-1" />
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
              <div className="p-12 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
                Selecione um lote ao lado para conferir os itens.
              </div>
            )}
          </div>
        </div>

        {/* Modal Montar Lote */}
        <Dialog open={buildModalOpen} onOpenChange={setBuildModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Montar ou Atualizar Lote do Mês
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Coleta todas as recompensas em status 'Aprovada' e adiciona ao lote do mês de
                apuração.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Mês de Referência (YYYY-MM)</Label>
                <Input
                  type="month"
                  value={monthRef}
                  onChange={(e) => setMonthRef(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuildModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={building || !monthRef}
                onClick={handleBuildBatch}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
              >
                {building ? 'Montando...' : 'Montar Lote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Liquidar Item do Lote */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Liquidar Recompensa do Lote
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                O lote não fecha com item sem comprovante anexado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-stone-950 p-3 border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Valor Final:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    R${' '}
                    {Number(selectedItem?.final_amount_brl || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Participante:</span>
                  <span className="text-stone-200">
                    {selectedItem?.expand?.participant_id?.expand?.user_id?.name || 'Participante'}
                  </span>
                </div>
              </div>

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
                <Label className="text-xs text-stone-300">Comprovante de Pagamento (Upload)</Label>
                <Input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Código da Transação</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ex: Pix E2E..."
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
                disabled={paying || (!proofFile && !selectedItem?.payment_proof_file)}
                onClick={handleConfirmItemPayment}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
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
