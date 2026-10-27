import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import {
  changeReferralStatus,
  getPublicReasonCodes,
  resolveAttributionHint,
} from '@/services/operations'
import { Referral, DuplicateFlag, Member } from '@/types/referral'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  ArrowRight,
  UserCheck,
  Building,
  Phone,
  Mail,
  Loader2,
  HelpCircle,
} from 'lucide-react'

export function AdminTriagePage() {
  const [triageReferrals, setTriageReferrals] = useState<Referral[]>([])
  const [duplicateFlags, setDuplicateFlags] = useState<Record<string, DuplicateFlag[]>>({})
  const [pendingAttributions, setPendingAttributions] = useState<Referral[]>([])
  const [networkMembers, setNetworkMembers] = useState<Member[]>([])
  const [reasonCodes, setReasonCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Action Dialog state
  const [actionModal, setActionModal] = useState<{
    open: boolean
    referral: Referral | null
    type: 'recusar' | 'duplicada' | 'resolve_attribution'
  }>({ open: false, referral: null, type: 'recusar' })

  const [selectedReasonCode, setSelectedReasonCode] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [targetMemberId, setTargetMemberId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      // 1. Load referrals in recebida and em_triagem
      const refs = await pb.collection('referrals').getFullList<Referral>({
        filter: "status = 'recebida' || status = 'em_triagem' || status = 'nova'",
        sort: '-created',
        expand: 'current_owner_id,condominium_id,participant_id',
      })
      setTriageReferrals(refs)

      // 2. Load duplicate flags
      const flags = await pb.collection('duplicate_flags').getFullList<DuplicateFlag>({
        filter: 'is_resolved = false',
        expand: 'conflicting_referral_id,conflicting_referral_id.current_owner_id',
      })
      const grouped: Record<string, DuplicateFlag[]> = {}
      flags.forEach((f) => {
        if (!grouped[f.referral_id]) grouped[f.referral_id] = []
        grouped[f.referral_id].push(f)
      })
      setDuplicateFlags(grouped)

      // 3. Load pending attribution hints (direto_site or attribution_status = pendente)
      const pending = await pb.collection('referrals').getFullList<Referral>({
        filter: "attribution_status = 'pendente'",
        sort: '-created',
      })
      setPendingAttributions(pending)

      // 4. Load members for manual attribution
      const members = await pb.collection('users').getFullList<Member>({
        sort: 'name',
      })
      setNetworkMembers(members)

      // 5. Load reason codes
      const codes = await getPublicReasonCodes()
      setReasonCodes(codes)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar triagem',
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

  const handleAccept = async (referral: Referral) => {
    try {
      setSubmitting(true)
      const target = 'aceita'
      // If currently 'recebida', move first to 'em_triagem' or direct to 'aceita'
      if (referral.status === 'recebida' || referral.status === 'nova') {
        await changeReferralStatus({
          referral_id: referral.id,
          target_status: 'em_triagem',
        })
      }
      await changeReferralStatus({
        referral_id: referral.id,
        target_status: target,
      })

      toast({
        title: 'Indicação aceita!',
        description: `Indicação #${referral.id.substring(0, 6)} movida para Em Análise / Aceita.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao aceitar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenActionModal = (
    referral: Referral,
    type: 'recusar' | 'duplicada' | 'resolve_attribution',
  ) => {
    setActionModal({ open: true, referral, type })
    setSelectedReasonCode('')
    setCustomReason('')
    setTargetMemberId('')
  }

  const handleSubmitModalAction = async () => {
    if (!actionModal.referral) return
    const ref = actionModal.referral
    setSubmitting(true)

    try {
      if (actionModal.type === 'resolve_attribution') {
        const action = targetMemberId ? 'confirmar' : 'recusar'
        await resolveAttributionHint({
          referral_id: ref.id,
          action,
          target_member_id: targetMemberId,
        })
        toast({
          title: 'Atribuição resolvida',
          description:
            action === 'confirmar'
              ? 'Indicação vinculada com sucesso ao indicador.'
              : 'Vínculo recusado.',
        })
      } else {
        // First ensure it's in em_triagem if it was recebida
        if (ref.status === 'recebida' || ref.status === 'nova') {
          await changeReferralStatus({
            referral_id: ref.id,
            target_status: 'em_triagem',
          })
        }

        const targetStatus = actionModal.type === 'recusar' ? 'recusada' : 'duplicada'
        await changeReferralStatus({
          referral_id: ref.id,
          target_status: targetStatus,
          status_reason: customReason || 'Motivo informado na triagem.',
          public_reason_code: selectedReasonCode || `motivo_${targetStatus}`,
        })

        toast({
          title: `Indicação marcada como ${targetStatus}!`,
          description: `Atualizada com motivo gravado na auditoria e código público.`,
        })
      }

      setActionModal({ open: false, referral: null, type: 'recusar' })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao processar ação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
            Fila de Triagem & Atribuições
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Avalie novas indicações nos estados Recebida e Em Triagem, examine alertas de
            duplicidade e resolva pendências de indicação direta.
          </p>
        </div>

        {/* Fila de Atribuições Pendentes */}
        {pendingAttributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-serif text-amber-200">
                Atribuições Pendentes ({pendingAttributions.length})
              </h2>
            </div>
            <p className="text-xs text-stone-400">
              Indicações de captação/compra direta do site em que o cliente declarou ter sido
              indicado por alguém, mas a vinculação automática não foi confirmada.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAttributions.map((p) => (
                <Card
                  key={p.id}
                  className="bg-stone-900 border-amber-500/30 rounded-none shadow-sm"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 rounded-none text-xs">
                        Origem: {p.source_origin || 'Direto Site'}
                      </Badge>
                      <span className="text-[11px] text-stone-400">
                        {new Date(p.created).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <CardTitle className="text-base text-stone-100 mt-2 font-medium">
                      {p.referrer_name || p.owner_name || p.buyer_name || 'Lead sem nome'}
                    </CardTitle>
                    <CardDescription className="text-stone-400 text-xs">
                      Pista de indicação informada:{' '}
                      <strong className="text-amber-300">
                        {p.attribution_hint || 'Não informada'}
                      </strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-xs text-stone-300 line-clamp-2">{p.description}</p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none border-stone-700 text-xs"
                        onClick={() => handleOpenActionModal(p, 'resolve_attribution')}
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                        Resolver Atribuição
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fila Principal de Triagem */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-stone-400" />
              <h2 className="text-lg font-serif text-stone-200">
                Fila de Triagem ({triageReferrals.length})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-none border-stone-800 text-xs text-stone-300"
            >
              {loading && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center text-stone-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
              Carregando fila de triagem...
            </div>
          ) : triageReferrals.length === 0 ? (
            <Card className="bg-stone-900/50 border-stone-800 rounded-none p-12 text-center">
              <p className="text-stone-400 text-sm">
                Nenhuma indicação pendente de triagem no momento. Tudo limpo!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {triageReferrals.map((ref) => {
                const flags = duplicateFlags[ref.id] || []
                const isProp =
                  ref.referral_type === 'proprietario' ||
                  ref.type === 'imovel' ||
                  ref.type === 'proprietario'
                const hasFlags = flags.length > 0

                return (
                  <Card
                    key={ref.id}
                    className={`rounded-none bg-stone-900 border transition-all ${
                      hasFlags ? 'border-amber-500/50 shadow-amber-950/20' : 'border-stone-800'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-5 justify-between">
                      {/* Left: Referral details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`rounded-none text-[11px] ${
                              isProp
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                            }`}
                          >
                            {isProp ? 'Captação (Proprietário)' : 'Comprador / Locatário'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-none border-stone-700 text-stone-400 text-[11px]"
                          >
                            Status: {ref.status}
                          </Badge>
                          <span className="text-[11px] text-stone-500">
                            #{ref.id.substring(0, 6)} •{' '}
                            {new Date(ref.created).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-serif text-lg text-white font-medium">
                            {ref.owner_name || ref.buyer_name || ref.referrer_name || 'Sem nome'}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-xs text-stone-400 mt-1">
                            {(ref.owner_phone || ref.buyer_phone || ref.referrer_phone) && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-stone-500" />
                                {ref.owner_phone || ref.buyer_phone || ref.referrer_phone}
                              </span>
                            )}
                            {(ref.owner_email || ref.buyer_email || ref.return_contact) && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-stone-500" />
                                {ref.owner_email || ref.buyer_email || ref.return_contact}
                              </span>
                            )}
                            {(ref.expand?.condominium_id || ref.unit) && (
                              <span className="flex items-center gap-1 text-amber-300">
                                <Building className="w-3.5 h-3.5 text-amber-400" />
                                {ref.expand?.condominium_id?.name || 'Condomínio'}
                                {ref.unit ? ` - Unidade ${ref.unit}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-stone-300 bg-stone-950/60 p-3 border border-stone-800/80 rounded-none">
                          {ref.description || 'Nenhuma descrição fornecida.'}
                        </p>

                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span>Indicado por:</span>
                          <strong className="text-stone-200">
                            {ref.expand?.current_owner_id?.name ||
                              ref.referrer_name ||
                              'Não identificado'}
                          </strong>
                        </div>
                      </div>

                      {/* Middle: Duplicate Alerts display SIDE BY SIDE */}
                      {hasFlags && (
                        <div className="lg:max-w-md w-full bg-amber-950/30 border border-amber-500/40 p-4 space-y-2.5">
                          <div className="flex items-center gap-2 text-amber-300 font-medium text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Alerta de Duplicidade Detectado:</span>
                          </div>

                          <div className="space-y-2">
                            {flags.map((flag) => (
                              <div
                                key={flag.id}
                                className="text-xs text-stone-300 bg-stone-900/90 p-2.5 border border-amber-500/20 rounded-none space-y-1"
                              >
                                <p className="font-medium text-amber-200">
                                  {flag.conflict_details}
                                </p>
                                {flag.expand?.conflicting_referral_id && (
                                  <div className="text-[11px] text-stone-400 flex items-center gap-1">
                                    <span>Conflito com:</span>
                                    <Link
                                      to={`/admin/indicacoes/${flag.conflicting_referral_id}`}
                                      className="text-amber-400 underline hover:text-amber-300 inline-flex items-center"
                                    >
                                      #{flag.conflicting_referral_id?.substring(0, 6)} (
                                      {flag.expand.conflicting_referral_id.status})
                                      <ArrowRight className="w-3 h-3 ml-0.5" />
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-stone-400 italic">
                            * O sistema nunca rejeita automaticamente. O operador tem autonomia para
                            validar ou declinar.
                          </p>
                        </div>
                      )}

                      {/* Right: Actions */}
                      <div className="flex lg:flex-col justify-end gap-2 shrink-0 self-end lg:self-center">
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleAccept(ref)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Aceitar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => handleOpenActionModal(ref, 'recusar')}
                          className="border-rose-900/60 text-rose-300 hover:bg-rose-950/40 rounded-none text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Recusar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => handleOpenActionModal(ref, 'duplicada')}
                          className="border-amber-700/60 text-amber-300 hover:bg-amber-950/40 rounded-none text-xs"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Duplicada
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-stone-400 hover:text-white rounded-none text-xs"
                        >
                          <Link to={`/admin/indicacoes/${ref.id}`}>Ver Detalhes</Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Ação (Recusar, Duplicada, Atribuição) */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) => !open && setActionModal((p) => ({ ...p, open: false }))}
      >
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-white">
              {actionModal.type === 'recusar' && 'Recusar Indicação'}
              {actionModal.type === 'duplicada' && 'Marcar como Duplicada'}
              {actionModal.type === 'resolve_attribution' && 'Resolver Atribuição de Indicador'}
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              {actionModal.type === 'resolve_attribution'
                ? 'Vincule a indicação ao membro parceiro correspondente ou recuse a atribuição.'
                : 'Defina o motivo e o código de comunicação pública para o participante.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {actionModal.type === 'resolve_attribution' ? (
              <div className="space-y-2">
                <label className="text-xs text-stone-300">
                  Selecionar Indicador (Deixe vazio para recusar):
                </label>
                <Select value={targetMemberId} onValueChange={setTargetMemberId}>
                  <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                    <SelectValue placeholder="Selecione o parceiro..." />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                    <SelectItem value="">(Nenhum - Recusar Atribuição)</SelectItem>
                    {networkMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email} ({m.agency || 'Godoy Prime'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300">Código de Motivo Público:</label>
                  <Select value={selectedReasonCode} onValueChange={setSelectedReasonCode}>
                    <SelectTrigger className="bg-stone-950 border-stone-800 rounded-none text-xs">
                      <SelectValue placeholder="Selecione o motivo que o indicador verá..." />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none">
                      {reasonCodes
                        .filter((c) =>
                          actionModal.type === 'duplicada'
                            ? c.category === 'duplicada'
                            : c.category === 'recusada' || c.category === 'perdida',
                        )
                        .map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.display_text}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300">
                    Justificativa Operacional Interna:
                  </label>
                  <Textarea
                    placeholder="Descreva o motivo detalhado para registro na auditoria..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="bg-stone-950 border-stone-800 rounded-none text-xs h-24"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setActionModal((p) => ({ ...p, open: false }))}
              className="rounded-none text-stone-400 hover:text-white text-xs"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                submitting ||
                (actionModal.type !== 'resolve_attribution' &&
                  (!selectedReasonCode || !customReason.trim()))
              }
              onClick={handleSubmitModalAction}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Confirmar Decisão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
