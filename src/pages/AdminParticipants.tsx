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
  AlertCircle,
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
  UserSquare2,
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Membros & Parceiros
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold flex items-center gap-2">
              <UserSquare2 className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Gestão de Participantes do Programa
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
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
            className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs h-9 font-heading"
          >
            <Ticket className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
            Gerar convite
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border p-4 flex flex-col sm:flex-row gap-3 items-center justify-between rounded-[1px] shadow-subtle">
          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"
              strokeWidth={1.5}
            />
            <Input
              placeholder="Buscar por nome, e-mail ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border-border pl-9 rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto font-heading">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="rounded-[1px] text-xs"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'pendente_aprovacao' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pendente_aprovacao')}
              className="rounded-[1px] text-xs"
            >
              Pendentes
            </Button>
            <Button
              variant={statusFilter === 'ativo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ativo')}
              className="rounded-[1px] text-xs"
            >
              Ativos
            </Button>
            <Button
              variant={statusFilter === 'suspenso' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('suspenso')}
              className="rounded-[1px] text-xs"
            >
              Suspensos
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 flex justify-center text-muted-foreground text-sm font-sans">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" strokeWidth={1.5} />
            Carregando participantes...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border rounded-[1px] p-12 text-center text-muted-foreground text-xs font-sans">
            Nenhum participante encontrado.
          </Card>
        ) : (
          <div className="bg-card border border-border overflow-x-auto rounded-[1px] shadow-subtle">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                <tr>
                  <th className="p-3">Participante</th>
                  <th className="p-3">Categoria / Nível</th>
                  <th className="p-3">Código Indicação</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Desempenho</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((p, idx) => {
                  const userRec = p.expand?.user_id
                  const m = metrics[p.user_id] || metrics[p.id] || { totalRefs: 0, dealsCount: 0 }

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-accent/40 transition-colors ${
                        idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {userRec?.name || 'Sem nome'}
                          </span>
                          {userRec?.verified ? (
                            <Badge
                              variant="outline"
                              className="rounded-[1px] border-success/40 bg-success/10 text-success text-[10px] px-1.5 py-0 flex items-center gap-1 font-heading"
                              title="E-mail verificado"
                            >
                              <CheckCircle2
                                className="w-2.5 h-2.5 text-success"
                                strokeWidth={1.5}
                              />
                              E-mail verificado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-[1px] border-warning/40 bg-warning/10 text-warning text-[10px] px-1.5 py-0 flex items-center gap-1 font-heading"
                              title="E-mail ainda não verificado"
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-warning" strokeWidth={1.5} />
                              E-mail não verificado
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {userRec?.email} • {userRec?.phone || 'Sem telefone'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="rounded-[1px] border-border text-foreground text-[10px] font-heading"
                        >
                          {p.expand?.category_id?.name || 'Membro'}
                        </Badge>
                        {p.expand?.level_id && (
                          <div className="text-[11px] text-gold-deep flex items-center gap-1 mt-0.5 font-heading">
                            <Award className="w-3 h-3 text-gold-deep" strokeWidth={1.5} />
                            {p.expand.level_id.name}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-gold-deep font-semibold">
                        {p.referral_code || userRec?.public_slug || '-'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`rounded-[1px] text-[10px] font-heading ${
                            p.status === 'ativo'
                              ? 'border-success/40 bg-success/10 text-success'
                              : p.status === 'pendente_aprovacao'
                                ? 'border-warning/40 bg-warning/10 text-warning'
                                : 'border-destructive/40 bg-destructive/10 text-destructive'
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-foreground">
                          <strong className="font-mono">{m.totalRefs}</strong> indicações
                        </span>
                        <span className="block text-[11px] text-muted-foreground font-mono">
                          {m.dealsCount} negócios fechados
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5 font-heading">
                          {p.status === 'pendente_aprovacao' && (
                            <Button
                              size="sm"
                              onClick={() => openApproveModal(p)}
                              disabled={submitting || !userRec?.verified}
                              title={
                                !userRec?.verified
                                  ? 'Aprovação bloqueada: participante ainda não verificou o e-mail'
                                  : 'Revisar e aprovar cadastro'
                              }
                              className={`rounded-[1px] text-xs ${
                                !userRec?.verified
                                  ? 'bg-secondary text-muted-foreground border border-border cursor-not-allowed opacity-70'
                                  : 'bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={1.5} />
                              Revisar / Aprovar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setContractModal({ open: true, part: p })}
                            className="rounded-[1px] text-xs"
                          >
                            <FileText className="w-3 h-3 mr-1" strokeWidth={1.5} />
                            Contrato
                          </Button>

                          {isAdmin && p.status !== 'suspenso' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSuspendModal({ open: true, part: p })}
                              className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-[1px] text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" strokeWidth={1.5} />
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
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground font-semibold">
              Aprovação de Participante
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-sans">
              Revise a categoria escolhida pelo participante no cadastro antes de confirmar a
              aprovação.
            </DialogDescription>
          </DialogHeader>

          {approveModal.part && (
            <div className="space-y-4 py-2 text-xs font-sans">
              <div className="p-3 bg-secondary/50 border border-border space-y-1.5 rounded-[1px]">
                <div className="text-foreground font-medium font-sans">
                  {approveModal.part.expand?.user_id?.name || 'Sem nome'}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {approveModal.part.expand?.user_id?.email} •{' '}
                  {approveModal.part.expand?.user_id?.phone || 'Sem telefone'}
                </div>
                <div className="text-[11px] text-foreground pt-1 border-t border-border">
                  <span className="text-muted-foreground">Categoria escolhida no cadastro: </span>
                  <span className="font-semibold text-gold-deep font-heading">
                    {approveModal.part.expand?.category_id?.name || 'Não informada'}
                  </span>
                </div>
                <div className="text-[11px] pt-1">
                  {approveModal.part.expand?.user_id?.verified ? (
                    <span className="text-success flex items-center gap-1 font-medium font-heading">
                      <CheckCircle2 className="w-3 h-3 text-success" strokeWidth={1.5} /> E-mail
                      verificado
                    </span>
                  ) : (
                    <span className="text-warning flex items-center gap-1 font-medium font-heading">
                      <AlertCircle className="w-3 h-3 text-warning" strokeWidth={1.5} /> E-mail
                      ainda não verificado pelo participante (aprovação bloqueada)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground font-heading font-medium block">
                  Categoria para Aprovação:
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-background border border-border text-foreground rounded-[1px] focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.front === 'comunidade' ? 'Comunidade' : 'Parceiros'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategoryId && selectedCategoryId !== approveModal.part.category_id && (
                <div className="space-y-1.5 p-3 bg-secondary/70 border border-border rounded-[1px]">
                  <label className="text-gold-deep font-heading font-medium block">
                    Motivo da Troca de Categoria (obrigatório para auditoria):
                  </label>
                  <Textarea
                    placeholder="Ex: Solicitante atua como síndico profissional e atende ao perfil da categoria..."
                    value={categoryChangeReason}
                    onChange={(e) => setCategoryChangeReason(e.target.value)}
                    className="bg-background border-border text-xs rounded-[1px] h-20 text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground font-sans">
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
              className="rounded-[1px] text-xs font-heading text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                submitting ||
                !approveModal.part?.expand?.user_id?.verified ||
                (selectedCategoryId !== approveModal.part?.category_id &&
                  !categoryChangeReason.trim())
              }
              title={
                !approveModal.part?.expand?.user_id?.verified
                  ? 'Aprovação bloqueada: participante com e-mail não verificado'
                  : ''
              }
              onClick={handleConfirmApprove}
              className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" strokeWidth={1.5} />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={1.5} />
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
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground font-semibold">
              Suspender Participante
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-sans">
              As indicações em aberto do participante ficarão congeladas para revisão de
              conformidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs font-sans">
            <label className="text-foreground font-heading font-medium">Motivo da Suspensão:</label>
            <Textarea
              placeholder="Descreva a irregularidade ou razão..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-background border-border text-xs rounded-[1px] h-24 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSuspendModal({ open: false, part: null })}
              className="rounded-[1px] text-xs font-heading text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !suspendReason.trim()}
              onClick={handleSuspend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[1px] text-xs font-heading font-semibold"
            >
              Confirmar Suspensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Gerar Convite Exclusivo */}
      <Dialog open={inviteModalOpen} onOpenChange={(open) => setInviteModalOpen(open)}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground font-semibold flex items-center gap-2">
              <Ticket className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
              Gerar Convite de Cadastro
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-sans">
              Gere um link exclusivo de convite para envio por WhatsApp a novos parceiros ou
              porteiros. O cadastro só é aceito com convite válido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs font-sans">
            {!generatedInviteCode ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-foreground font-heading font-medium block">
                    Categoria sugerida (opcional):
                  </label>
                  <select
                    value={inviteCategory}
                    onChange={(e) => setInviteCategory(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-background border border-border text-foreground rounded-[1px] focus:outline-none focus:ring-1 focus:ring-primary font-sans"
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
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Se indicada, o cadastro já preenche esta categoria como padrão.
                  </p>
                </div>

                <Button
                  onClick={handleCreateInvitation}
                  disabled={isGeneratingInvite}
                  className="w-full rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs h-10 font-heading"
                >
                  {isGeneratingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} />
                      Gerando Código...
                    </>
                  ) : (
                    'Gerar Código de Convite'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                <div className="p-4 bg-secondary/50 border border-border text-center space-y-2 rounded-[1px]">
                  <span className="text-[10px] text-gold-deep uppercase tracking-label font-heading font-semibold block">
                    Código do Convite
                  </span>
                  <div className="text-2xl font-mono font-bold tracking-wider text-foreground">
                    {generatedInviteCode}
                  </div>
                  <span className="text-[11px] text-muted-foreground block font-sans">
                    Válido por 30 dias para 1 utilização exclusiva
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-heading font-medium block">
                    Link Completo de Cadastro:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={getInviteLink()}
                      className="bg-background border-border text-foreground text-xs rounded-[1px] font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={copyInviteLink}
                      className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] shrink-0 text-xs px-3 font-heading font-semibold"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 font-heading">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 rounded-[1px] border-success/40 bg-success/10 hover:bg-success/20 text-success text-xs"
                  >
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Olá! Você foi convidado para o programa exclusivo de indicações da Godoy Prime. Acesse o link abaixo para concluir seu cadastro:\n\n${getInviteLink()}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                      Enviar pelo WhatsApp
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setGeneratedInviteCode('')
                      setInviteCategory('')
                    }}
                    className="rounded-[1px] text-xs text-muted-foreground hover:text-foreground font-heading"
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
              className="rounded-[1px] text-xs font-heading"
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
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-foreground font-semibold">
              Anexar Contrato de Parceria (partner-contracts)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-sans">
              Upload seguro para o bucket privado <em>partner-contracts</em>, com acesso restrito
              por URL assinada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-foreground font-heading font-medium">
                Título do Instrumento:
              </label>
              <Input
                placeholder="Ex: Contrato de Corretagem e Indicação Assinado"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                className="bg-background border-border text-xs rounded-[1px] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-foreground font-heading font-medium">
                Arquivo PDF do Contrato:
              </label>
              <Input
                type="file"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                className="bg-background border-border text-xs rounded-[1px] text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setContractModal({ open: false, part: null })}
              className="rounded-[1px] text-xs font-heading text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !contractFile}
              onClick={handleUploadContract}
              className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
            >
              Fazer Upload Protegido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
