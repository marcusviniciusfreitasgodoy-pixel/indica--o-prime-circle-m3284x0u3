import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { useAuth } from '@/contexts/AuthContext'
import {
  Referral,
  ReferralEvent,
  ContactAttempt,
  ReferralNote,
  ReferralTask,
  DocumentItem,
  CaptureRecord,
  Member,
} from '@/types/referral'
import {
  changeReferralStatus,
  declineByGodoy,
  requestCapture,
  approveCapture,
  returnCapture,
  registerListing,
  registerDeal,
  confirmConsent,
  registerFirstVisit,
  getDocumentDownloadUrl,
  getReferralEvents,
  getContactAttempts,
  addContactAttempt,
  getReferralNotes,
  addReferralNote,
  getReferralTasks,
  addReferralTask,
  toggleReferralTask,
  getReferralDocuments,
  uploadDocument,
  getCaptureRecords,
  getPublicReasonCodes,
  assignOperator,
  markFirstContactDone,
  markContactRefused,
} from '@/services/operations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Building,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  ListTodo,
  ShieldCheck,
  Send,
  ExternalLink,
  Download,
  Upload,
  ArrowRight,
  Loader2,
  DollarSign,
  Share2,
  Copy,
  Check,
  UserX,
  MessageCircle,
} from 'lucide-react'

export function AdminReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin, isOperator, refreshUser } = useAuth()
  const { toast } = useToast()

  const [referral, setReferral] = useState<Referral | null>(null)
  const [events, setEvents] = useState<ReferralEvent[]>([])
  const [contactAttempts, setContactAttempts] = useState<ContactAttempt[]>([])
  const [notes, setNotes] = useState<ReferralNote[]>([])
  const [tasks, setTasks] = useState<ReferralTask[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [captures, setCaptures] = useState<CaptureRecord[]>([])
  const [reasonCodes, setReasonCodes] = useState<any[]>([])
  const [operators, setOperators] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Forms states
  const [newNote, setNewNote] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')

  // Contact Attempt Modal
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactChannel, setContactChannel] = useState<
    'whatsapp' | 'telefone' | 'email' | 'presencial'
  >('whatsapp')
  const [contactOutcome, setContactOutcome] = useState<any>('sucesso')
  const [contactNotes, setContactNotes] = useState('')

  // Change Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [publicReasonCode, setPublicReasonCode] = useState('')
  const [lossResponsibility, setLossResponsibility] = useState<
    'proprietario' | 'indicacao_invalida'
  >('proprietario')
  const [dealValueBrl, setDealValueBrl] = useState<string>('')
  const [dealDate, setDealDate] = useState<string>('')

  // Decline by Godoy Modal
  const [declineModalOpen, setDeclineModalOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // Formalize Capture Modal
  const [captureModalOpen, setCaptureModalOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState('')
  const [instrumentType, setInstrumentType] = useState('autorizacao_simples')

  // Return Capture Modal
  const [returnCaptureModalOpen, setReturnCaptureModalOpen] = useState(false)
  const [returnCaptureId, setReturnCaptureId] = useState('')
  const [returnReason, setReturnReason] = useState('')

  // Register First Visit Modal (Buyer referral)
  const [firstVisitModalOpen, setFirstVisitModalOpen] = useState(false)
  const [firstVisitDate, setFirstVisitDate] = useState(new Date().toISOString().substring(0, 10))
  const [firstVisitCapacity, setFirstVisitCapacity] = useState<'sim' | 'nao'>('sim')
  const [firstVisitProofType, setFirstVisitProofType] = useState<string>('pre_aprovacao_credito')
  const [firstVisitDescription, setFirstVisitDescription] = useState('')

  // Register Listing Modal
  const [listingModalOpen, setListingModalOpen] = useState(false)
  const [listingLink, setListingLink] = useState('')
  const [isReservedListing, setIsReservedListing] = useState(false)
  const [publicSummary, setPublicSummary] = useState('')

  // Register Deal Modal
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [dealBuyerRefId, setDealBuyerRefId] = useState('')
  const [dealType, setDealType] = useState<'venda' | 'locacao'>('venda')
  const [dealDescription, setDealDescription] = useState('')

  // Upload Document Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // C10b — Primeiro Contato states
  const [contactRefusedModalOpen, setContactRefusedModalOpen] = useState(false)
  const [contactRefusedReason, setContactRefusedReason] = useState(
    'Indicado não quer ser contatado',
  )
  const [submittingFirstContact, setSubmittingFirstContact] = useState(false)
  const [submittingRefusal, setSubmittingRefusal] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [creciInput, setCreciInput] = useState('')
  const [savingCreci, setSavingCreci] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [refRes, evRes, caRes, ntRes, tkRes, docRes, cpRes, rcRes, opsRes] = await Promise.all([
        pb.collection('referrals').getOne<Referral>(id, {
          expand:
            'current_owner_id,original_owner_id,condominium_id,assigned_operator_id,participant_id',
        }),
        getReferralEvents(id),
        getContactAttempts(id),
        getReferralNotes(id),
        getReferralTasks(id),
        getReferralDocuments(id),
        getCaptureRecords(id),
        getPublicReasonCodes(),
        pb.collection('users').getFullList<Member>({ sort: 'name' }),
      ])

      setReferral(refRes)
      setEvents(evRes)
      setContactAttempts(caRes)
      setNotes(ntRes)
      setTasks(tkRes)
      setDocuments(docRes)
      setCaptures(cpRes)
      setReasonCodes(rcRes)
      setOperators(opsRes)

      // Initialize defaults for modals
      setPublicSummary(refRes.public_summary || refRes.description || '')
      setListingLink(refRes.listing_link || '')
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar indicação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // Operator Assignment
  const handleAssignOperator = async (operatorId: string) => {
    if (!referral) return
    try {
      await assignOperator(referral.id, operatorId || null)
      toast({ title: 'Responsável atribuído com sucesso.' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao atribuir', description: err.message, variant: 'destructive' })
    }
  }

  // Operator Consent Confirmation
  const handleConfirmConsent = async () => {
    if (!referral) return
    try {
      await confirmConsent(referral.id)
      toast({ title: 'Consentimento confirmado pelo operador!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao confirmar consentimento',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !referral) return
    try {
      await addReferralNote(referral.id, newNote.trim())
      setNewNote('')
      toast({ title: 'Nota operacional adicionada!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar nota', description: err.message, variant: 'destructive' })
    }
  }

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !referral) return
    try {
      await addReferralTask({
        referral_id: referral.id,
        title: newTaskTitle.trim(),
        due_date: newTaskDate || undefined,
        assigned_to: user?.id,
      })
      setNewTaskTitle('')
      setNewTaskDate('')
      toast({ title: 'Tarefa cadastrada com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar tarefa', description: err.message, variant: 'destructive' })
    }
  }

  // Submit Contact Attempt
  const handleAddContactAttempt = async () => {
    if (!referral) return
    try {
      setSubmitting(true)
      await addContactAttempt({
        referral_id: referral.id,
        channel: contactChannel,
        outcome: contactOutcome,
        notes: contactNotes.trim(),
      })
      setContactModalOpen(false)
      setContactNotes('')
      toast({ title: 'Tentativa de contato registrada!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar contato',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Status Change
  const handleChangeStatus = async () => {
    if (!referral || !targetStatus) return
    try {
      setSubmitting(true)
      await changeReferralStatus({
        referral_id: referral.id,
        target_status: targetStatus,
        status_reason: statusReason,
        public_reason_code: publicReasonCode,
        loss_responsibility: lossResponsibility,
        deal_value_brl: dealValueBrl ? Number(dealValueBrl) : undefined,
        deal_date: dealDate || undefined,
      })
      setStatusModalOpen(false)
      toast({ title: 'Status alterado com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro na transição', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Decline by Godoy
  const handleDeclineByGodoy = async () => {
    if (!referral || !declineReason.trim()) return
    try {
      setSubmitting(true)
      await declineByGodoy(referral.id, declineReason.trim())
      setDeclineModalOpen(false)
      toast({
        title: 'Indicação declinada pela Godoy',
        description: 'No painel do indicador ela constará com o status Reconhecida.',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao declinar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Document Upload
  const handleUploadDoc = async () => {
    if (!referral || !uploadFile || !uploadTitle.trim()) return
    try {
      setSubmitting(true)
      const form = new FormData()
      form.append('referral_id', referral.id)
      form.append('bucket_type', 'capture-documents')
      form.append('title', uploadTitle.trim())
      form.append('file', uploadFile)
      form.append('uploaded_by', user?.id || '')
      form.append('file_type', uploadFile.type || 'application/pdf')

      await uploadDocument(form)
      setUploadModalOpen(false)
      setUploadFile(null)
      setUploadTitle('')
      toast({ title: 'Documento protegido anexado com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro no envio do documento',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Request Capture
  const handleRequestCapture = async () => {
    if (!referral || !selectedDocId || !instrumentType) return
    try {
      setSubmitting(true)
      await requestCapture({
        referral_id: referral.id,
        document_id: selectedDocId,
        instrument_type: instrumentType,
      })
      setCaptureModalOpen(false)
      toast({
        title: 'Formalização de captação solicitada!',
        description: 'Aguardando aprovação de outro operador ou administrador.',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao solicitar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Approve Capture
  const handleApproveCapture = async (capId: string) => {
    try {
      setSubmitting(true)
      await approveCapture(capId)
      toast({
        title: 'Captação aprovada!',
        description: 'Imóvel oficialmente captado e ponto de recompensa acionado.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Não foi possível aprovar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Return Capture
  const handleReturnCapture = async () => {
    if (!returnCaptureId || !returnReason.trim()) return
    try {
      setSubmitting(true)
      await returnCapture(returnCaptureId, returnReason.trim())
      setReturnCaptureModalOpen(false)
      setReturnReason('')
      toast({ title: 'Formalização devolvida para ajustes.' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao devolver', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Register First Visit
  const handleRegisterFirstVisit = async () => {
    if (!referral || !firstVisitDate) return
    try {
      setSubmitting(true)
      const res = await registerFirstVisit({
        referral_id: referral.id,
        data: firstVisitDate,
        capacidade_financeira_demonstrada: firstVisitCapacity,
        tipo_comprovacao: firstVisitProofType,
        descricao: firstVisitDescription.trim(),
      })
      setFirstVisitModalOpen(false)
      toast({
        title: 'Primeira visita registrada!',
        description: res.reward_created
          ? res.reward_info || 'Recompensa de primeira visita gerada com sucesso!'
          : res.reward_info || 'Atendimento registrado na linha do tempo.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar primeira visita',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Register Listing
  const handleRegisterListing = async () => {
    if (!referral) return
    try {
      setSubmitting(true)
      await registerListing({
        referral_id: referral.id,
        listing_link: listingLink.trim(),
        is_reserved_listing: isReservedListing,
        public_summary: publicSummary.trim(),
      })
      setListingModalOpen(false)
      toast({
        title: 'Imóvel em divulgação pública!',
        description: 'Vitrine pública ativada para compartilhamento pelo parceiro.',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao divulgar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Register Deal
  const handleRegisterDeal = async () => {
    if (!referral || !dealValueBrl || !dealDate) return
    try {
      setSubmitting(true)
      const isProp =
        referral.referral_type === 'proprietario' ||
        referral.type === 'imovel' ||
        referral.type === 'proprietario'
      await registerDeal({
        owner_referral_id: isProp ? referral.id : undefined,
        buyer_referral_id: !isProp ? referral.id : dealBuyerRefId || undefined,
        deal_type: dealType,
        value_brl: Number(dealValueBrl),
        deal_date: dealDate,
        property_description: dealDescription || referral.description,
      })
      setDealModalOpen(false)
      toast({
        title: 'Negócio fechado e registrado!',
        description: 'Transição concluída com sucesso e gravada em deals e auditoria.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar negócio',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Download protected document via signed URL
  const handleDownloadDoc = async (docId: string) => {
    try {
      const url = await getDocumentDownloadUrl(docId)
      window.open(url, '_blank')
    } catch (err: any) {
      toast({
        title: 'Falha ao baixar documento',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // C10b — Handler: Contato feito, origem informada
  const handleFirstContactDone = async () => {
    if (!referral) return
    try {
      setSubmittingFirstContact(true)
      const res = await markFirstContactDone(referral.id)
      toast({
        title: 'Primeiro contato registrado!',
        description: 'Origem informada ao indicado e data registrada com sucesso.',
      })
      // Atualiza o estado local imediatamente e recarrega
      setReferral((prev) =>
        prev
          ? {
              ...prev,
              first_contact_at: res.first_contact_at,
              first_contact_by: res.first_contact_by,
            }
          : null,
      )
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar primeiro contato',
        description: err.message || 'Falha ao comunicar com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingFirstContact(false)
    }
  }

  // C10b — Handler: Indicado não quer ser contatado
  const handleContactRefusedConfirm = async () => {
    if (!referral) return
    try {
      setSubmittingRefusal(true)
      await markContactRefused(referral.id, contactRefusedReason.trim())
      setContactRefusedModalOpen(false)
      toast({
        title: 'Contato recusado',
        description: 'Dados pessoais do indicado apagados e indicação cancelada.',
      })
      // Atualiza o estado local imediatamente para refletir cancelada
      setReferral((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelada',
              status_reason: contactRefusedReason.trim(),
              owner_name: '[DADOS APAGADOS - CONTATO RECUSADO]',
              owner_phone: '',
              owner_email: '',
              buyer_name: '[DADOS APAGADOS - CONTATO RECUSADO]',
              buyer_phone: '',
              buyer_email: '',
            }
          : null,
      )
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar recusa de contato',
        description: err.message || 'Falha ao processar cancelamento.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingRefusal(false)
    }
  }

  // C10b — Handler: Salvar CRECI do corretor logado
  const handleSaveCreci = async () => {
    if (!user || !creciInput.trim()) return
    try {
      setSavingCreci(true)
      const updatedUser = await pb.collection('users').update<Member>(user.id, {
        creci: creciInput.trim(),
      })
      await refreshUser()
      toast({
        title: 'CRECI atualizado com sucesso!',
        description: `CRECI ${updatedUser.creci} gravado no seu perfil.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar CRECI',
        description: err.message || 'Não foi possível salvar o CRECI.',
        variant: 'destructive',
      })
    } finally {
      setSavingCreci(false)
    }
  }

  if (loading || !referral) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
        <AdminNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
          <span className="text-stone-400">Carregando detalhes da indicação...</span>
        </div>
      </div>
    )
  }

  const isProp =
    referral.referral_type === 'proprietario' ||
    referral.type === 'imovel' ||
    referral.type === 'proprietario'
  const memberCode =
    referral.expand?.participant_id?.referral_code ||
    referral.expand?.current_owner_id?.public_slug ||
    referral.current_owner_id

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                className={`rounded-none text-xs ${
                  isProp
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
              >
                {isProp ? 'Captação (Proprietário)' : 'Comprador / Locatário'}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-none border-stone-700 text-stone-300 text-xs"
              >
                Status Atual: <strong className="ml-1 text-white">{referral.status}</strong>
              </Badge>
              <span className="text-xs text-stone-500">#{referral.id.substring(0, 8)}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              {referral.owner_name || referral.buyer_name || referral.referrer_name || 'Sem nome'}
            </h1>
            <p className="text-xs text-stone-400">
              Registrado em{' '}
              {new Date(referral.created).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              por{' '}
              <strong className="text-stone-200">
                {referral.expand?.current_owner_id?.name || referral.referrer_name || 'Indicador'}
              </strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setTargetStatus('')
                setStatusReason('')
                setPublicReasonCode('')
                setStatusModalOpen(true)
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              Mudar Status
            </Button>

            {isAdmin &&
              ['qualificada', 'em_negociacao', 'captacao_solicitada'].includes(referral.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeclineModalOpen(true)}
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40 rounded-none text-xs"
                >
                  Declinar pela Godoy
                </Button>
              )}

            {isProp && referral.status === 'captada' && (
              <Button
                size="sm"
                onClick={() => setListingModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Colocar em Divulgação
              </Button>
            )}

            {!isProp && (
              <Button
                size="sm"
                onClick={() => {
                  setFirstVisitDate(
                    referral.primeira_visita_at
                      ? referral.primeira_visita_at.substring(0, 10)
                      : new Date().toISOString().substring(0, 10),
                  )
                  setFirstVisitCapacity(
                    referral.capacidade_financeira_demonstrada === 'nao' ? 'nao' : 'sim',
                  )
                  setFirstVisitModalOpen(true)
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-none text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Registrar primeira visita
              </Button>
            )}

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setDealModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Registrar Negócio (Venda/Locação)
              </Button>
            )}
          </div>
        </div>

        {/* C10b — Quadro "Primeiro contato": Apenas para admin e operador em consent_status = 'declarado_indicador' */}
        {(isAdmin || isOperator) &&
          referral.consent_status === 'declarado_indicador' &&
          (() => {
            // Extração do primeiro nome do indicado
            const rawIndicatedName =
              referral.owner_name || referral.buyer_name || referral.referrer_name || ''
            const indicatedFirstName =
              rawIndicatedName && !rawIndicatedName.startsWith('[DADOS APAGADOS')
                ? rawIndicatedName.trim().split(/\s+/)[0]
                : '[primeiro nome do indicado]'

            // Nome do corretor logado e CRECI
            const brokerName = user?.name?.trim() || 'Corretor'
            const brokerCreci = user?.creci?.trim() || '[número]'

            // Extração do primeiro nome do indicador
            const rawReferrerName =
              referral.expand?.participant_id?.expand?.user_id?.name ||
              referral.expand?.current_owner_id?.name ||
              referral.referrer_name ||
              ''
            const referrerFirstName = rawReferrerName
              ? rawReferrerName.trim().split(/\s+/)[0]
              : 'um parceiro'

            // Finalidade: vender / alugar / comprar
            const finalidade =
              referral.type === 'imovel' || referral.type === 'proprietario' ? 'vender' : 'comprar'

            const contactMessageText = `Olá, ${indicatedFirstName}. Aqui é ${brokerName}, corretor da Godoy Prime Realty, CRECI ${brokerCreci}. ${referrerFirstName} nos contou que você pode ter interesse em ${finalidade} um imóvel. Podemos conversar? Se preferir não ser contatado, responda NÃO e apagaremos os seus dados.`

            const isContactDone = !!referral.first_contact_at
            const isCancelled = referral.status === 'cancelada'
            const buttonsDisabled = isCancelled || submittingFirstContact || submittingRefusal

            const handleCopyText = async () => {
              try {
                await navigator.clipboard.writeText(contactMessageText)
                setCopiedMessage(true)
                toast({ title: 'Texto copiado com sucesso!' })
                setTimeout(() => setCopiedMessage(false), 2500)
              } catch (_) {
                toast({
                  title: 'Erro ao copiar',
                  description: 'Não foi possível copiar para a área de transferência.',
                  variant: 'destructive',
                })
              }
            }

            return (
              <Card className="bg-amber-950/20 border-2 border-amber-500/50 rounded-none shadow-lg">
                <CardHeader className="pb-3 border-b border-amber-500/20 bg-amber-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-base font-serif text-amber-200 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-amber-400" />
                      Primeiro Contato — Indicação Direta
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 rounded-none text-xs">
                        consent_status: declarado_indicador
                      </Badge>
                      {isContactDone && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 rounded-none text-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Primeiro contato realizado
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 rounded-none text-xs">
                          Indicação Cancelada
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-stone-300 text-xs">
                    Esta indicação foi cadastrada com consentimento declarado pelo indicador. O
                    corretor responsável deve realizar o primeiro contato informando a origem e
                    dando a opção de recusa (LGPD).
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs">
                  {/* 1. Mensagem pronta */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-300 font-medium">
                        Mensagem oficial pré-formatada para primeiro contato:
                      </span>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={handleCopyText}
                        className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20 rounded-none text-xs h-7 px-3 flex items-center gap-1.5"
                      >
                        {copiedMessage ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Texto
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="p-3.5 bg-stone-950 border border-stone-800 text-stone-200 text-xs font-mono leading-relaxed rounded-none select-all">
                      {contactMessageText}
                    </div>
                  </div>

                  {/* 3. Se o CRECI do corretor logado estiver vazio, permitir salvar no próprio quadro */}
                  {!user?.creci && (
                    <div className="p-3 bg-stone-950/80 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5 text-xs">
                        <span className="font-semibold text-amber-300 block">
                          Meu CRECI não informado
                        </span>
                        <span className="text-stone-400 text-[11px] block">
                          Cadastre seu número de CRECI para sair automaticamente nas mensagens
                          prontas de primeiro contato.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Ex: 12345-F/RJ"
                          value={creciInput}
                          onChange={(e) => setCreciInput(e.target.value)}
                          className="bg-stone-900 border-stone-700 text-xs rounded-none h-8 w-36 text-stone-100"
                        />
                        <Button
                          size="sm"
                          disabled={savingCreci || !creciInput.trim()}
                          onClick={handleSaveCreci}
                          className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs h-8 px-3"
                        >
                          {savingCreci ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Selo/Linha de confirmação de primeiro contato se já realizado */}
                  {referral.first_contact_at && (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Primeiro contato registrado em{' '}
                          <strong>
                            {new Date(referral.first_contact_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </strong>
                          {referral.expand?.first_contact_by?.name && (
                            <span className="text-emerald-300/80 ml-1">
                              por {referral.expand.first_contact_by.name}
                            </span>
                          )}
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-300 rounded-none text-[10px]"
                      >
                        Concluído
                      </Badge>
                    </div>
                  )}

                  {/* Aviso se a indicação estiver cancelada por recusa */}
                  {isCancelled && (
                    <div className="p-2.5 bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Indicação cancelada: o contato foi recusado ou finalizado. Dados do indicado
                        foram anonimizados.
                      </span>
                    </div>
                  )}

                  {/* 2. Botões de ação do quadro */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      disabled={buttonsDisabled || isContactDone}
                      onClick={handleFirstContactDone}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs h-9 px-4 flex items-center gap-1.5"
                    >
                      {submittingFirstContact ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-200" />
                      )}
                      {isContactDone
                        ? 'Primeiro contato já registrado'
                        : 'Contato feito, origem informada'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={buttonsDisabled}
                      onClick={() => {
                        setContactRefusedReason('Indicado não quer ser contatado')
                        setContactRefusedModalOpen(true)
                      }}
                      className="border-rose-800 text-rose-300 hover:bg-rose-950/60 rounded-none text-xs h-9 px-4 flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1 text-rose-400" />
                      Indicado não quer ser contatado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

        {/* Informações Centrais em 3 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Dados do Indicado / Imóvel */}
          <Card className="bg-stone-900 border-stone-800 rounded-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif text-amber-300 flex items-center gap-1.5">
                <Building className="w-4 h-4" />
                Dados do Imóvel & Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-stone-300">
              <div>
                <span className="text-stone-500 block">Nome do Indicado:</span>
                <span className="font-medium text-stone-100">
                  {referral.owner_name || referral.buyer_name || referral.referrer_name}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Telefone:</span>
                <span className="flex items-center gap-1 font-mono text-stone-200">
                  <Phone className="w-3 h-3 text-stone-500" />
                  {referral.owner_phone ||
                    referral.buyer_phone ||
                    referral.referrer_phone ||
                    'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">E-mail:</span>
                <span className="flex items-center gap-1 font-mono text-stone-200">
                  <Mail className="w-3 h-3 text-stone-500" />
                  {referral.owner_email ||
                    referral.buyer_email ||
                    referral.return_contact ||
                    'Não informado'}
                </span>
              </div>

              {referral.expand?.condominium_id && (
                <div>
                  <span className="text-stone-500 block">Condomínio & Unidade:</span>
                  <span className="text-amber-300 font-medium">
                    {referral.expand.condominium_id.name}
                    {referral.unit ? ` - Bloco/Unidade ${referral.unit}` : ''}
                  </span>
                  <span className="block text-stone-400 text-[11px]">
                    {referral.expand.condominium_id.neighborhood}
                  </span>
                </div>
              )}

              <div>
                <span className="text-stone-500 block">Descrição/Observações:</span>
                <p className="bg-stone-950 p-2.5 border border-stone-800 text-[11px] text-stone-300 whitespace-pre-wrap">
                  {referral.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Col 2: Indicador e Governança */}
          <Card className="bg-stone-900 border-stone-800 rounded-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif text-amber-300 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Indicador & Governança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-stone-300">
              <div>
                <span className="text-stone-500 block">Membro Parceiro:</span>
                <span className="font-medium text-stone-100">
                  {referral.expand?.current_owner_id?.name || 'Membro não identificado'}
                </span>
                <span className="block text-stone-400 text-[11px]">
                  {referral.expand?.current_owner_id?.email}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Origem & Canal:</span>
                <span className="font-mono text-stone-200">
                  {referral.source_origin || referral.channel || 'Link Direto'}
                </span>
              </div>

              {/* Consentimento do Proprietário */}
              <div className="p-2.5 bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Consentimento:</span>
                  {referral.consent_confirmed_by_operator ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 rounded-none text-[10px]">
                      Confirmado pelo Operador
                    </Badge>
                  ) : referral.consent_declared ? (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 rounded-none text-[10px]">
                      Declarado pelo Indicador
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-stone-700 text-stone-500 text-[10px] rounded-none"
                    >
                      Não Declarado
                    </Badge>
                  )}
                </div>

                {!referral.consent_confirmed_by_operator && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConfirmConsent}
                    className="w-full text-xs rounded-none border-amber-500/30 text-amber-300 hover:bg-amber-950/40"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar Consentimento em Contato
                  </Button>
                )}
              </div>

              {/* Atribuição de Operador Responsável */}
              <div className="space-y-1">
                <span className="text-stone-500 block">Operador Responsável:</span>
                <Select
                  value={referral.assigned_operator_id || ''}
                  onValueChange={handleAssignOperator}
                >
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue placeholder="Atribuir Operador..." />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="">(Não atribuído)</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name || op.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vitrine link if em_divulgacao */}
              {referral.status === 'em_divulgacao' && (
                <div className="p-2.5 bg-blue-950/30 border border-blue-500/30 space-y-1">
                  <span className="text-blue-300 font-medium block">Vitrine Pública Ativa</span>
                  <Link
                    to={`/v/${memberCode}/${referral.id}`}
                    target="_blank"
                    className="text-xs text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                  >
                    Ver página da Vitrine
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Col 3: Formalização da Captação */}
          <Card className="bg-stone-900 border-stone-800 rounded-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-serif text-amber-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Formalização da Captação
              </CardTitle>
              {isProp && referral.status === 'em_negociacao' && (
                <Button
                  size="sm"
                  onClick={() => setCaptureModalOpen(true)}
                  className="rounded-none text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Solicitar Formalização
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {captures.length === 0 ? (
                <p className="text-stone-500 italic">
                  Nenhuma solicitação de formalização registrada ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {captures.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-3 bg-stone-950 border border-stone-800 space-y-2 rounded-none"
                    >
                      <div className="flex justify-between items-start">
                        <Badge
                          className={`rounded-none text-[10px] ${
                            cap.status === 'aprovada'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : cap.status === 'solicitada'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {cap.status.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] text-stone-500">
                          {new Date(cap.requested_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="text-stone-300">
                        <p>
                          <strong>Instrumento:</strong> {cap.instrument_type}
                        </p>
                        <p>
                          <strong>Solicitado por:</strong>{' '}
                          {cap.expand?.requested_by?.name || 'Operador'}
                        </p>
                        {cap.approved_by && (
                          <p>
                            <strong>Aprovado por:</strong>{' '}
                            {cap.expand?.approved_by?.name || 'Admin'}
                          </p>
                        )}
                        {cap.return_reason && (
                          <p className="text-rose-400 mt-1">
                            <strong>Motivo devolução:</strong> {cap.return_reason}
                          </p>
                        )}
                      </div>

                      {/* Download attached contract */}
                      {cap.document_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadDoc(cap.document_id)}
                          className="w-full text-xs rounded-none border-stone-700 text-stone-300"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Baixar Documento Anexado
                        </Button>
                      )}

                      {/* Approve / Return Actions */}
                      {cap.status === 'solicitada' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={submitting}
                            onClick={() => handleApproveCapture(cap.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReturnCaptureId(cap.id)
                              setReturnCaptureModalOpen(true)
                            }}
                            className="flex-1 border-rose-900 text-rose-300 hover:bg-rose-950/40 rounded-none text-xs"
                          >
                            Devolver
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Abas Operacionais: Tentativas de Contato, Notas, Tarefas, Documentos, Histórico */}
        <Tabs defaultValue="contato" className="w-full space-y-4">
          <TabsList className="bg-stone-900 border border-stone-800 rounded-none p-1">
            <TabsTrigger
              value="contato"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              Tentativas de Contato ({contactAttempts.length})
            </TabsTrigger>
            <TabsTrigger
              value="notas"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Notas Internas ({notes.length})
            </TabsTrigger>
            <TabsTrigger
              value="tarefas"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <ListTodo className="w-3.5 h-3.5 mr-1.5" />
              Tarefas ({tasks.length})
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Documentos & Contratos ({documents.length})
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-none text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Linha do Tempo ({events.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: TENTATIVAS DE CONTATO */}
          <TabsContent value="contato" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-400">
                Registro rigoroso de ligações, WhatsApp, e-mails e reuniões presenciais.
              </span>
              <Button
                size="sm"
                onClick={() => setContactModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
              >
                + Registrar Tentativa
              </Button>
            </div>

            <div className="space-y-3">
              {contactAttempts.length === 0 ? (
                <p className="text-stone-500 text-xs py-4 text-center">
                  Nenhuma tentativa de contato registrada.
                </p>
              ) : (
                contactAttempts.map((ca) => (
                  <div
                    key={ca.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-none flex justify-between items-start text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-none border-stone-700 text-amber-300 uppercase text-[10px]"
                        >
                          {ca.channel}
                        </Badge>
                        <Badge
                          className={`rounded-none text-[10px] ${
                            ca.outcome === 'sucesso'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}
                        >
                          {ca.outcome}
                        </Badge>
                      </div>
                      <p className="text-stone-300 mt-1">
                        {ca.notes || 'Sem observações adicionais.'}
                      </p>
                      <p className="text-stone-500 text-[11px]">
                        Por: {ca.expand?.operator_id?.name || 'Operador'}
                      </p>
                    </div>
                    <span className="text-[11px] text-stone-500">
                      {new Date(ca.created).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 2: NOTAS INTERNAS */}
          <TabsContent value="notas" className="space-y-4">
            <form onSubmit={handleAddNote} className="space-y-2">
              <Textarea
                placeholder="Adicionar nota operacional interna (NUNCA visível ao participante)..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="bg-stone-900 border-stone-800 text-xs rounded-none h-20"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Salvar Nota Interna
                </Button>
              </div>
            </form>

            <div className="space-y-3 pt-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="p-3 bg-stone-900/80 border border-stone-800 rounded-none text-xs space-y-1"
                >
                  <div className="flex justify-between items-center text-[11px] text-stone-500">
                    <span className="font-medium text-amber-300/90">
                      {n.expand?.author_id?.name || 'Operador'}
                    </span>
                    <span>
                      {new Date(n.created).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-stone-200 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: TAREFAS */}
          <TabsContent value="tarefas" className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input
                placeholder="Título da tarefa operacional..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-stone-900 border-stone-800 text-xs rounded-none flex-1"
              />
              <Input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="bg-stone-900 border-stone-800 text-xs rounded-none w-44"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs shrink-0"
              >
                + Adicionar Tarefa
              </Button>
            </form>

            <div className="space-y-2 pt-2">
              {tasks.length === 0 ? (
                <p className="text-stone-500 text-xs py-4 text-center">Nenhuma tarefa pendente.</p>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-none flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!t.is_completed}
                        onChange={async (e) => {
                          await toggleReferralTask(t.id, e.target.checked)
                          loadData()
                        }}
                        className="rounded-none bg-stone-950 border-stone-700 text-amber-500"
                      />
                      <span
                        className={
                          t.is_completed ? 'line-through text-stone-500' : 'text-stone-200'
                        }
                      >
                        {t.title}
                      </span>
                    </div>

                    {t.due_date && (
                      <span className="text-[11px] text-stone-400">
                        Vence em: {new Date(t.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 4: DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-400">
                Arquivos armazenados nos buckets privados de captação e parceiros (acesso restrito
                por URL assinada).
              </span>
              <Button
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Anexar Documento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.length === 0 ? (
                <p className="col-span-2 text-stone-500 text-xs py-4 text-center">
                  Nenhum documento anexado.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-none flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-medium text-stone-200">{doc.title}</p>
                      <span className="text-[10px] text-stone-500">
                        Enviado em {new Date(doc.created).toLocaleDateString('pt-BR')} por{' '}
                        {doc.expand?.uploaded_by?.name || 'Operador'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDoc(doc.id)}
                      className="border-stone-700 text-stone-300 rounded-none text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Baixar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 5: LINHA DO TEMPO */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4 relative pl-4 border-l border-stone-800 ml-2 py-2">
              {events.map((ev) => (
                <div key={ev.id} className="relative space-y-1 text-xs">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-200">{ev.to_status}</span>
                    {ev.public_label && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-stone-700 text-stone-400 rounded-none"
                      >
                        Rótulo Indicador: {ev.public_label}
                      </Badge>
                    )}
                    <span className="text-[11px] text-stone-500 ml-auto">
                      {new Date(ev.created).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {ev.from_status && (
                    <span className="text-[11px] text-stone-500 block">
                      Transicionado de: <em>{ev.from_status}</em>
                    </span>
                  )}
                  {ev.reason && (
                    <p className="text-amber-300/90 bg-stone-950 p-2 border border-stone-800 rounded-none">
                      <strong>Motivo:</strong> {ev.reason}
                    </p>
                  )}
                  <span className="text-[10px] text-stone-500 block">
                    Por: {ev.actor_name || 'Sistema'}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL: Mudar Status Operacional */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Mudar Status da Indicação
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              A transição será validada contra a matriz de regras operacionais de{' '}
              {isProp ? 'proprietário' : 'comprador'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-stone-300 font-medium">Status de Destino:</label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                  <SelectValue placeholder="Selecione o novo status..." />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                  {isProp ? (
                    <>
                      <SelectItem value="em_triagem">Em Triagem</SelectItem>
                      <SelectItem value="aceita">Aceita</SelectItem>
                      <SelectItem value="em_contato">Em Contato</SelectItem>
                      <SelectItem value="qualificada">Qualificada</SelectItem>
                      <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                      <SelectItem value="captada">Captada</SelectItem>
                      <SelectItem value="recusada">Recusada</SelectItem>
                      <SelectItem value="duplicada">Duplicada</SelectItem>
                      <SelectItem value="perdida">Perdida</SelectItem>
                      <SelectItem value="retirada">Retirada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="em_triagem">Em Triagem</SelectItem>
                      <SelectItem value="aceita">Aceita</SelectItem>
                      <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                      <SelectItem value="visitando">Visitando</SelectItem>
                      <SelectItem value="proposta">Proposta</SelectItem>
                      <SelectItem value="perdida">Perdida</SelectItem>
                      <SelectItem value="recusada">Recusada</SelectItem>
                      <SelectItem value="duplicada">Duplicada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Motivos obrigatórios */}
            {['recusada', 'duplicada', 'perdida', 'retirada', 'cancelada'].includes(
              targetStatus,
            ) && (
              <>
                <div className="space-y-1.5">
                  <label className="text-stone-300 font-medium">
                    Código do Motivo Público (Indicador verá):
                  </label>
                  <Select value={publicReasonCode} onValueChange={setPublicReasonCode}>
                    <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                      <SelectValue placeholder="Selecione o código público..." />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                      {reasonCodes
                        .filter((c) => c.category === targetStatus || c.category === 'perdida')
                        .map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.display_text}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-300 font-medium">
                    Motivo / Justificativa Interna:
                  </label>
                  <Textarea
                    placeholder="Descreva o motivo detalhado para fins de auditoria..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="bg-stone-950 border-stone-800 text-xs rounded-none h-20"
                  />
                </div>
              </>
            )}

            {/* Perdida exige responsabilidade */}
            {targetStatus === 'perdida' && (
              <div className="space-y-1.5">
                <label className="text-stone-300 font-medium">Responsabilidade da Perda:</label>
                <Select
                  value={lossResponsibility}
                  onValueChange={(val: any) => setLossResponsibility(val)}
                >
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="indicacao_invalida">Indicação Inválida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setStatusModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !targetStatus}
              onClick={handleChangeStatus}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Confirmar Mudança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Declinar pela Godoy */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Declinar pela Godoy Prime
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Apenas administradores. A indicação será movida para <em>declinada_pela_godoy</em> e
              aparecerá como <strong>Reconhecida</strong> no painel do participante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <label className="text-stone-300 font-medium">Motivo Estratégico do Declínio:</label>
            <Textarea
              placeholder="Descreva a razão comercial/estratégica..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="bg-stone-950 border-stone-800 text-xs rounded-none h-24"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeclineModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !declineReason.trim()}
              onClick={handleDeclineByGodoy}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                'Confirmar Declínio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Solicitar Formalização da Captação */}
      <Dialog open={captureModalOpen} onOpenChange={setCaptureModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Solicitar Formalização de Captação
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Exige anexo de autorização/contrato de corretagem. O solicitante não poderá aprovar
              esta formalização.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-stone-300 font-medium">Tipo de Instrumento:</label>
              <Select value={instrumentType} onValueChange={setInstrumentType}>
                <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                  <SelectItem value="autorizacao_simples">Autorização Simples</SelectItem>
                  <SelectItem value="autorizacao_exclusiva">
                    Autorização com Exclusividade
                  </SelectItem>
                  <SelectItem value="contrato_parceria">Contrato de Parceria</SelectItem>
                  <SelectItem value="termo_opcao">Termo de Opção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-stone-300 font-medium">Documento Vinculado:</label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                  <SelectValue placeholder="Selecione um documento da lista..." />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {documents.length === 0 && (
                <p className="text-rose-400 text-[11px]">
                  * É necessário anexar um documento na aba 'Documentos & Contratos' primeiro.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCaptureModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !selectedDocId}
              onClick={handleRequestCapture}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Devolver Formalização */}
      <Dialog open={returnCaptureModalOpen} onOpenChange={setReturnCaptureModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Devolver Formalização
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              A indicação retornará para o status <em>em_negociacao</em> para adequações pelo
              operador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <label className="text-stone-300 font-medium">Motivo da Devolução / Ajustes:</label>
            <Textarea
              placeholder="Descreva as pendências da documentação..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="bg-stone-950 border-stone-800 text-xs rounded-none h-24"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReturnCaptureModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !returnReason.trim()}
              onClick={handleReturnCapture}
              className="bg-rose-700 hover:bg-rose-800 text-white rounded-none text-xs"
            >
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Anúncio (Em Divulgação) */}
      <Dialog open={listingModalOpen} onOpenChange={setListingModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Colocar Imóvel em Divulgação
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Muda para <em>em_divulgacao</em> e libera link público de vitrine para
              compartilhamento pelo parceiro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Link do Anúncio (Site/Portal):</label>
              <Input
                placeholder="https://godoyprime.com.br/imovel/..."
                value={listingLink}
                onChange={(e) => setListingLink(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-stone-300">
              <input
                type="checkbox"
                checked={isReservedListing}
                onChange={(e) => setIsReservedListing(e.target.checked)}
                className="bg-stone-950 border-stone-700 rounded-none"
              />
              Modo Divulgação Reservada (Off-market)
            </label>

            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Resumo Público (Vitrine):</label>
              <Textarea
                placeholder="Resumo atraente sem divulgar número de unidade nem dados confidenciais..."
                value={publicSummary}
                onChange={(e) => setPublicSummary(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setListingModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || (!isReservedListing && !listingLink) || !publicSummary}
              onClick={handleRegisterListing}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs"
            >
              Publicar Divulgação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Negócio Fechado */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Registrar Negócio Fechado
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Só administradores. Conclui o negócio, gravando valor e data em <em>deals</em> e na
              indicação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Tipo de Operação:</label>
              <Select value={dealType} onValueChange={(val: any) => setDealType(val)}>
                <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Valor do Negócio (BRL):</label>
                <Input
                  type="number"
                  placeholder="Ex: 2500000"
                  value={dealValueBrl}
                  onChange={(e) => setDealValueBrl(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Data do Fechamento:</label>
                <Input
                  type="date"
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                />
              </div>
            </div>

            {isProp && (
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">
                  ID Indicação Comprador (Opcional - se houver):
                </label>
                <Input
                  placeholder="ID da indicação compradora para cruzar lados no deal..."
                  value={dealBuyerRefId}
                  onChange={(e) => setDealBuyerRefId(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDealModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !dealValueBrl || !dealDate}
              onClick={handleRegisterDeal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
            >
              Registrar Negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Anexar Documento */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Anexar Documento Protegido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Título do Documento:</label>
              <Input
                placeholder="Ex: Autorização de Venda com Exclusividade"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Arquivo (PDF, Imagem, Contrato):</label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setUploadModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting || !uploadFile || !uploadTitle}
              onClick={handleUploadDoc}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Fazer Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Primeira Visita (Comprador) */}
      <Dialog open={firstVisitModalOpen} onOpenChange={setFirstVisitModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Registrar Primeira Visita / Atendimento
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Registre a realização da primeira visita para indicação de comprador e a avaliação da
              capacidade financeira. O evento constará na linha do tempo como "Atendimento
              realizado".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Data do Atendimento / Visita:</label>
              <Input
                type="date"
                value={firstVisitDate}
                onChange={(e) => setFirstVisitDate(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-300 font-medium">
                Capacidade Financeira Demonstrada?
              </label>
              <Select
                value={firstVisitCapacity}
                onValueChange={(val: 'sim' | 'nao') => setFirstVisitCapacity(val)}
              >
                <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                  <SelectItem value="sim">
                    Sim (gera recompensa de R$ 500 para indicador ativo)
                  </SelectItem>
                  <SelectItem value="nao">
                    Não (apenas registra atendimento sem recompensa)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {firstVisitCapacity === 'sim' && (
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Tipo de Comprovação:</label>
                <Select
                  value={firstVisitProofType}
                  onValueChange={(val: string) => setFirstVisitProofType(val)}
                >
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="pre_aprovacao_credito">Pré-aprovação de crédito</SelectItem>
                    <SelectItem value="comprovante_recursos">Comprovante de recursos</SelectItem>
                    <SelectItem value="outro">Outro (com descrição)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-stone-300 font-medium">
                Descrição{' '}
                {firstVisitCapacity === 'sim' && firstVisitProofType === 'outro'
                  ? '(obrigatória)'
                  : '(opcional)'}
                :
              </label>
              <Textarea
                placeholder="Detalhes da comprovação e do atendimento ao comprador..."
                value={firstVisitDescription}
                onChange={(e) => setFirstVisitDescription(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setFirstVisitModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                submitting ||
                !firstVisitDate ||
                (firstVisitCapacity === 'sim' &&
                  firstVisitProofType === 'outro' &&
                  !firstVisitDescription.trim())
              }
              onClick={handleRegisterFirstVisit}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-none text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Registrando...
                </>
              ) : (
                'Salvar Atendimento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Tentativa de Contato */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              Registrar Tentativa de Contato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Canal:</label>
                <Select value={contactChannel} onValueChange={(val: any) => setContactChannel(val)}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Resultado:</label>
                <Select value={contactOutcome} onValueChange={(val: any) => setContactOutcome(val)}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="sucesso">Sucesso / Conversou</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="agendou_retorno">Agendou Retorno</SelectItem>
                    <SelectItem value="recusou">Recusou Atendimento</SelectItem>
                    <SelectItem value="numero_invalido">Número Inválido</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Observações da Conversa:</label>
              <Textarea
                placeholder="Detalhes tratados com o cliente..."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                className="bg-stone-950 border-stone-800 text-xs rounded-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setContactModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Cancelar
            </Button>
            <Button
              disabled={submitting}
              onClick={handleAddContactAttempt}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* C10b — MODAL: Confirmação de Indicado Não Quer Ser Contatado */}
      <Dialog open={contactRefusedModalOpen} onOpenChange={setContactRefusedModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Confirmar Recusa de Contato
            </DialogTitle>
            <DialogDescription className="text-stone-300 text-xs">
              Atenção: esta ação é irreversível sob as diretrizes da LGPD. Os dados pessoais do
              indicado (nome, telefone, e-mail, CPF e descrição) serão apagados permanentemente, a
              indicação será marcada como cancelada e quaisquer recompensas/gratificações não pagas
              serão canceladas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-1">
              <p className="font-semibold">O que acontecerá ao confirmar:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-stone-300 text-[11px]">
                <li>Dados de contato do indicado serão apagados imediatamente;</li>
                <li>
                  Status mudará para <strong>cancelada</strong> com rótulo "Não aproveitada";
                </li>
                <li>Recompensas e gratificações pendentes serão canceladas;</li>
                <li>Ação será registrada na auditoria do sistema.</li>
              </ul>
            </div>

            <div className="space-y-1">
              <label className="text-stone-300 font-medium">Motivo do cancelamento / recusa:</label>
              <Input
                value={contactRefusedReason}
                onChange={(e) => setContactRefusedReason(e.target.value)}
                placeholder="Ex: Indicado não quer ser contatado"
                className="bg-stone-950 border-stone-800 text-xs rounded-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              disabled={submittingRefusal}
              onClick={() => setContactRefusedModalOpen(false)}
              className="rounded-none text-xs text-stone-400"
            >
              Voltar / Cancelar
            </Button>
            <Button
              disabled={submittingRefusal || !contactRefusedReason.trim()}
              onClick={handleContactRefusedConfirm}
              className="bg-rose-700 hover:bg-rose-800 text-white rounded-none text-xs"
            >
              {submittingRefusal ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Apagando dados e cancelando...
                </>
              ) : (
                'Sim, apagar dados e cancelar indicação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
