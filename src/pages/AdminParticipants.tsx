import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { useAuth } from '@/contexts/AuthContext'
import { Participant, Member } from '@/types/referral'
import {
  approveParticipant,
  suspendParticipant,
  getDocumentDownloadUrl,
  uploadDocument,
} from '@/services/operations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  CheckCircle2,
  Ban,
  Upload,
  FileText,
  Search,
  Loader2,
  ShieldAlert,
  Award,
  Ticket,
  Copy,
  Check,
  Send,
} from 'lucide-react'

export function AdminParticipantsPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Performance stats per participant (referrals count, deals count)
  const [metrics, setMetrics] = useState<Record<string, { totalRefs: number; dealsCount: number }>>(
    {},
  )
  const [categoriesList, setCategoriesList] = useState<
    Array<{ id: string; name: string; slug: string; front: string }>
  >([])

  // Approve modal
  const [approveModal, setApproveModal] = useState<{ open: boolean; part: Participant | null }>({
    open: false,
    part: null,
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryChangeReason, setCategoryChangeReason] = useState('')

  // Suspend modal
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; part: Participant | null }>({
    open: false,
    part: null,
  })
  const [suspendReason, setSuspendReason] = useState('')

  // Contract upload modal
  const [contractModal, setContractModal] = useState<{ open: boolean; part: Participant | null }>({
    open: false,
    part: null,
  })
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractTitle, setContractTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Gerar convite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteCategory, setInviteCategory] = useState('')
  const [generatedInviteCode, setGeneratedInviteCode] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [res, cats] = await Promise.all([
        pb.collection('participants').getFullList<Participant>({
          sort: '-created',
          expand: 'user_id,category_id,level_id,approved_by',
        }),
        pb.collection('participant_categories').getFullList<any>({
          sort: 'front,slug',
        }),
      ])
      setParticipants(res)
      setCategoriesList(cats)

      // Calculate real counts from referrals
      const allRefs = await pb.collection('referrals').getFullList({
        fields: 'id,original_owner_id,participant_id,status',
      })
      const map: Record<string, { totalRefs: number; dealsCount: number }> = {}

      allRefs.forEach((r: any) => {
        const ownerId = r.original_owner_id || r.participant_id
        if (!ownerId) return
        if (!map[ownerId]) map[ownerId] = { totalRefs: 0, dealsCount: 0 }
        map[ownerId].totalRefs += 1
        if (['vendida', 'alugada', 'comprou', 'alugou'].includes(r.status)) {
          map[ownerId].dealsCount += 1
        }
      })
      setMetrics(map)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar participantes',
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

  const openApproveModal = (part: Participant) => {
    setApproveModal({ open: true, part })
    setSelectedCategoryId(part.category_id || '')
    setCategoryChangeReason('')
  }

  const handleConfirmApprove = async () => {
    if (!approveModal.part) return
    const isCategoryChanged =
      selectedCategoryId && selectedCategoryId !== approveModal.part.category_id

    if (isCategoryChanged && !categoryChangeReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da alteração de categoria para registro em auditoria.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await approveParticipant(approveModal.part.id, {
        newCategoryId: isCategoryChanged ? selectedCategoryId : undefined,
        changeReason: isCategoryChanged ? categoryChangeReason.trim() : undefined,
      })
      toast({
        title: 'Participante Aprovado!',
        description: `Cadastro de ${approveModal.part.expand?.user_id?.name || 'Parceiro'} está agora ativo.`,
      })
      setApproveModal({ open: false, part: null })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuspend = async () => {
    if (!suspendModal.part || !suspendReason.trim()) return
    try {
      setSubmitting(true)
      await suspendParticipant(suspendModal.part.id, suspendReason.trim())
      setSuspendModal({ open: false, part: null })
      setSuspendReason('')
      toast({
        title: 'Participante Suspenso',
        description: 'Indicações abertas ficam congeladas para revisão.',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao suspender', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadContract = async () => {
    if (!contractModal.part || !contractFile) return
    try {
      setSubmitting(true)
      const form = new FormData()
      form.append('participant_id', contractModal.part.id)
      form.append('bucket_type', 'partner-contracts')
      form.append('title', contractTitle || 'Contrato de Parceria Assinado')
      form.append('file', contractFile)
      form.append('uploaded_by', pb.authStore.record?.id || '')
      form.append('file_type', contractFile.type || 'application/pdf')

      await uploadDocument(form)
      setContractModal({ open: false, part: null })
      setContractFile(null)
      setContractTitle('')
      toast({ title: 'Contrato de parceria anexado com sucesso ao bucket partner-contracts!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro no envio do contrato',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = participants.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = p.expand?.user_id?.name?.toLowerCase().includes(q)
      const matchEmail = p.expand?.user_id?.email?.toLowerCase().includes(q)
      const matchCode = p.referral_code?.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchCode) return false
    }
    return true
  })

  // Gerador de código de convite sem letras ambíguas (sem O, I, L, 0, 1)
  const generateCleanCode = (len = 8) => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    let res = ''
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return res
  }

  const handleCreateInvitation = async () => {
    try {
      setIsGeneratingInvite(true)
      const code = generateCleanCode(8)
      // Validade de 30 dias por padrão
      const expires = new Date()
      expires.setDate(expires.getDate() + 30)

      await pb.collection('invitations').create({
        code,
        category_id: inviteCategory || null,
        created_by: pb.authStore.record?.id,
        expires_at: expires.toISOString(),
      })

      setGeneratedInviteCode(code)
      setCopiedLink(false)
      toast({
        title: 'Convite Gerado!',
        description: `Código ${code} criado com sucesso. Válido por 30 dias.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar convite',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const getInviteLink = () => {
    if (!generatedInviteCode) return ''
    const origin = window.location.origin
    return `${origin}/cadastro?convite=${generatedInviteCode}`
  }

  const copyInviteLink = () => {
    const link = getInviteLink()
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
    toast({
      title: 'Link copiado!',
      description: 'O link de cadastro com convite foi copiado para a área de transferência.',
    })
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              Gestão de Participantes do Programa
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Aprovação de categorias, anexo de contratos assinados (partner-contracts), suspensão e
              desempenho.
            </p>
          </div>

          <Button
            onClick={() => {
              setInviteModalOpen(true)
              setGeneratedInviteCode('')
              setInviteCategory('')
            }}
            className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs h-9"
          >
            <Ticket className="w-4 h-4 mr-1.5" />
            Gerar convite
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-stone-900 border border-stone-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por nome, e-mail ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-stone-950 border-stone-800 pl-9 rounded-none text-xs"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={`rounded-none text-xs ${
                statusFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'pendente_aprovacao' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pendente_aprovacao')}
              className={`rounded-none text-xs ${
                statusFilter === 'pendente_aprovacao'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Pendentes
            </Button>
            <Button
              variant={statusFilter === 'ativo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ativo')}
              className={`rounded-none text-xs ${
                statusFilter === 'ativo'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Ativos
            </Button>
            <Button
              variant={statusFilter === 'suspenso' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('suspenso')}
              className={`rounded-none text-xs ${
                statusFilter === 'suspenso'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Suspensos
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 flex justify-center text-stone-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
            Carregando participantes...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-stone-900 border-stone-800 rounded-none p-12 text-center text-stone-500 text-xs">
            Nenhum participante encontrado.
          </Card>
        ) : (
          <div className="bg-stone-900 border border-stone-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 border-b border-stone-800 text-stone-400">
                <tr>
                  <th className="p-3">Participante</th>
                  <th className="p-3">Categoria / Nível</th>
                  <th className="p-3">Código Indicação</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Desempenho</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filtered.map((p) => {
                  const userRec = p.expand?.user_id
                  const m = metrics[p.user_id] || metrics[p.id] || { totalRefs: 0, dealsCount: 0 }

                  return (
                    <tr key={p.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-stone-200">
                          {userRec?.name || 'Sem nome'}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {userRec?.email} • {userRec?.phone || 'Sem telefone'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="rounded-none border-stone-700 text-stone-300 text-[10px]"
                        >
                          {p.expand?.category_id?.name || 'Membro'}
                        </Badge>
                        {p.expand?.level_id && (
                          <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                            <Award className="w-3 h-3" />
                            {p.expand.level_id.name}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-amber-300">
                        {p.referral_code || userRec?.public_slug || '-'}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`rounded-none text-[10px] ${
                            p.status === 'ativo'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : p.status === 'pendente_aprovacao'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-stone-300">
                          <strong>{m.totalRefs}</strong> indicações
                        </span>
                        <span className="block text-[11px] text-stone-500">
                          {m.dealsCount} negócios fechados
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {p.status === 'pendente_aprovacao' && (
                            <Button
                              size="sm"
                              onClick={() => openApproveModal(p)}
                              disabled={submitting}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Revisar / Aprovar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setContractModal({ open: true, part: p })}
                            className="border-stone-700 text-stone-300 rounded-none text-xs"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Contrato
                          </Button>

                          {isAdmin && p.status !== 'suspenso' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSuspendModal({ open: true, part: p })}
                              className="border-rose-900/60 text-rose-300 hover:bg-rose-950/40 rounded-none text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Suspender
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Aprovar Participante (com revisão/troca de categoria) */}
      <Dialog
        open={approveModal.open}
        onOpenChange={(open) => !open && setApproveModal({ open: false, part: null })}
      >
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Aprovação de Participante
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Revise a categoria escolhida pelo participante no cadastro antes de confirmar a
              aprovação.
            </DialogDescription>
          </DialogHeader>

          {approveModal.part && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-stone-950 border border-stone-800 space-y-1.5">
                <div className="text-stone-200 font-medium">
                  {approveModal.part.expand?.user_id?.name || 'Sem nome'}
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {approveModal.part.expand?.user_id?.email} •{' '}
                  {approveModal.part.expand?.user_id?.phone || 'Sem telefone'}
                </div>
                <div className="text-[11px] text-stone-300 pt-1 border-t border-stone-800/80">
                  <span className="text-stone-500">Categoria escolhida no cadastro: </span>
                  <span className="font-semibold text-amber-400">
                    {approveModal.part.expand?.category_id?.name || 'Não informada'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-stone-300 font-medium block">
                  Categoria para Aprovação:
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-stone-950 border border-stone-800 text-stone-100 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.front === 'comunidade' ? 'Comunidade' : 'Parceiros'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategoryId && selectedCategoryId !== approveModal.part.category_id && (
                <div className="space-y-1.5 p-3 bg-amber-950/20 border border-amber-900/50">
                  <label className="text-amber-400 font-medium block">
                    Motivo da Troca de Categoria (obrigatório para auditoria):
                  </label>
                  <Textarea
                    placeholder="Ex: Solicitante atua como síndico profissional e atende ao perfil da categoria..."
                    value={categoryChangeReason}
                    onChange={(e) => setCategoryChangeReason(e.target.value)}
                    className="bg-stone-950 border-stone-800 text-xs rounded-none h-20 placeholder:text-stone-600"
                  />
                  <p className="text-[10px] text-stone-400">
                    Esta alteração e o motivo serão registrados permanentemente em audit_logs.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setApproveModal({ open: false, part: null })}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                submitting ||
                (selectedCategoryId !== approveModal.part?.category_id &&
                  !categoryChangeReason.trim())
              }
              onClick={handleConfirmApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Suspender Participante */}
      <Dialog
        open={suspendModal.open}
        onOpenChange={(open) => !open && setSuspendModal({ open: false, part: null })}
      >
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Suspender Participante
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              As indicações em aberto do participante ficarão congeladas para revisão de
              conformidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <label className="text-stone-300 font-medium">Motivo da Suspensão:</label>
            <Textarea
              placeholder="Descreva a irregularidade ou razão..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-stone-950 border-stone-800 text-xs rounded-none h-24"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSuspendModal({ open: false, part: null })}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !suspendReason.trim()}
              onClick={handleSuspend}
              className="bg-rose-700 hover:bg-rose-800 text-white rounded-none text-xs"
            >
              Confirmar Suspensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Gerar Convite Exclusivo */}
      <Dialog open={inviteModalOpen} onOpenChange={(open) => setInviteModalOpen(open)}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              Gerar Convite de Cadastro
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Gere um link exclusivo de convite para envio por WhatsApp a novos parceiros ou
              porteiros. O cadastro só é aceito com convite válido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {!generatedInviteCode ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-stone-300 font-medium block">
                    Categoria sugerida (opcional):
                  </label>
                  <select
                    value={inviteCategory}
                    onChange={(e) => setInviteCategory(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-stone-950 border border-stone-800 text-stone-100 rounded-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Nenhuma (o participante escolhe)</option>
                    {categoriesList
                      .filter((c: any) => c.pilot_enabled !== false)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-stone-500">
                    Se indicada, o cadastro já preenche esta categoria como padrão.
                  </p>
                </div>

                <Button
                  onClick={handleCreateInvitation}
                  disabled={isGeneratingInvite}
                  className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs h-10"
                >
                  {isGeneratingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Gerando Código...
                    </>
                  ) : (
                    'Gerar Código de Convite'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-stone-950 border border-amber-500/40 text-center space-y-2">
                  <span className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold block">
                    Código do Convite
                  </span>
                  <div className="text-2xl font-mono font-bold tracking-wider text-white">
                    {generatedInviteCode}
                  </div>
                  <span className="text-[11px] text-stone-400 block">
                    Válido por 30 dias para 1 utilização exclusiva
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-300 font-medium block">
                    Link Completo de Cadastro:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={getInviteLink()}
                      className="bg-stone-950 border-stone-800 text-stone-200 text-xs rounded-none font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={copyInviteLink}
                      className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 shrink-0 text-xs px-3"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 rounded-none border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs"
                  >
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Olá! Você foi convidado para o programa exclusivo de indicações da Godoy Prime. Acesse o link abaixo para concluir seu cadastro:\n\n${getInviteLink()}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Enviar pelo WhatsApp
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setGeneratedInviteCode('')
                      setInviteCategory('')
                    }}
                    className="rounded-none text-xs text-stone-400"
                  >
                    Gerar outro
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              className="rounded-none text-xs text-stone-400 border-stone-800"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Anexo de Contrato de Parceiro */}
      <Dialog
        open={contractModal.open}
        onOpenChange={(open) => !open && setContractModal({ open: false, part: null })}
      >
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Anexar Contrato de Parceria (partner-contracts)
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Upload seguro para o bucket privado <em>partner-contracts</em>, com acesso restrito
              por URL assinada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Título do Instrumento:</label>
              <Input
                placeholder="Ex: Contrato de Corretagem e Indicação Assinado"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Arquivo PDF do Contrato:</label>
              <Input
                type="file"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setContractModal({ open: false, part: null })}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !contractFile}
              onClick={handleUploadContract}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              Fazer Upload Protegido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
