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
} from 'lucide-react'

export function AdminParticipantsPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Performance stats per participant (referrals count, deals count)
  const [metrics, setMetrics] = useState<Record<string, { totalRefs: number; dealsCount: number }>>({})

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

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await pb.collection('participants').getFullList<Participant>({
        sort: '-created',
        expand: 'user_id,category_id,level_id,approved_by',
      })
      setParticipants(res)

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

  const handleApprove = async (part: Participant) => {
    try {
      setSubmitting(true)
      await approveParticipant(part.id)
      toast({
        title: 'Participante Aprovado!',
        description: `Cadastro de ${part.expand?.user_id?.name || 'Parceiro'} está agora ativo.`,
      })
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
      toast({ title: 'Erro no envio do contrato', description: err.message, variant: 'destructive' })
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
              Aprovação de categorias, anexo de contratos assinados (partner-contracts), suspensão e desempenho.
            </p>
          </div>
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
                statusFilter === 'all' ? 'bg-amber-600 text-white' : 'border-stone-800 text-stone-400'
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
                statusFilter === 'ativo' ? 'bg-amber-600 text-white' : 'border-stone-800 text-stone-400'
              }`}
            >
              Ativos
            </Button>
            <Button
              variant={statusFilter === 'suspenso' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('suspenso')}
              className={`rounded-none text-xs ${
                statusFilter === 'suspenso' ? 'bg-amber-600 text-white' : 'border-stone-800 text-stone-400'
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
                              onClick={() => handleApprove(p)}
                              disabled={submitting}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Aprovar
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

      {/* Modal: Suspender Participante */}
      <Dialog
        open={suspendModal.open}
        onOpenChange={(open) => !open && setSuspendModal({ open: false, part: null })}
      >
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">Suspender Participante</DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              As indicações em aberto do participante ficarão congeladas para revisão de conformidade.
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
              Upload seguro para o bucket privado <em>partner-contracts</em>, com acesso restrito por URL assinada.
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
