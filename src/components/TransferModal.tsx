import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Member, Referral } from '@/types/referral'
import { ArrowRightLeft, Building2, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TransferModalProps {
  referral: Referral | null
  networkMembers: Member[]
  currentUserId: string
  isOpen: boolean
  onClose: () => void
  onConfirmTransfer: (targetMemberId: string, reason: string) => Promise<void>
}

export const TransferModal: React.FC<TransferModalProps> = ({
  referral,
  networkMembers,
  currentUserId,
  isOpen,
  onClose,
  onConfirmTransfer,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter out the current owner
  const availableMembers = networkMembers.filter((m) => m.id !== currentUserId)

  const handleConfirm = async () => {
    if (!selectedMemberId) {
      setError('Por favor, selecione para qual membro da rede deseja repassar.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onConfirmTransfer(selectedMemberId, reason)
      setSelectedMemberId('')
      setReason('')
      onClose()
    } catch (err: unknown) {
      console.error('Erro ao transferir:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao efetuar repasse.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!referral) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <ArrowRightLeft className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              Repasse em Parceria
            </span>
          </div>
          <DialogTitle className="text-lg font-semibold text-white">
            Repassar Indicação para a Rede
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Esta indicação será transferida para o painel de outro corretor/imobiliária da Prime
            Circle, mantendo todo o histórico de origem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3 text-xs space-y-1">
            <div className="font-medium text-slate-200">
              Indicação:{' '}
              <span className="text-amber-400 font-semibold">{referral.referrer_name}</span> (
              {referral.type === 'imovel' ? 'Imóvel' : 'Cliente'})
            </div>
            <p className="text-slate-400 line-clamp-2">{referral.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-member" className="text-xs font-medium text-slate-200">
              Selecionar Membro Destinatário *
            </Label>
            {availableMembers.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                Não há outros membros cadastrados na rede para repasse no momento.
              </p>
            ) : (
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger
                  id="target-member"
                  className="bg-slate-950 border-slate-700 text-slate-100 focus:ring-amber-500"
                >
                  <SelectValue placeholder="Escolha um corretor ou imobiliária..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {availableMembers.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="focus:bg-slate-800 focus:text-white"
                    >
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-medium text-white">{m.name}</span>
                        {m.agency && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building2 className="h-3 w-3 inline" />
                            {m.agency}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-reason" className="text-xs font-medium text-slate-200">
              Observação / Motivo do Repasse (opcional)
            </Label>
            <Textarea
              id="transfer-reason"
              placeholder="Ex.: Imóvel fora da minha região de atuação; cliente procura perfil comercial..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs focus-visible:ring-amber-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedMemberId || availableMembers.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Repassando...
              </>
            ) : (
              'Confirmar Repasse'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
