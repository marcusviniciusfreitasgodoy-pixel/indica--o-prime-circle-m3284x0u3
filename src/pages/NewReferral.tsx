import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { createManualReferral } from '@/services/referrals'
import { ReferralType } from '@/types/referral'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlusCircle, Home, Users, ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function NewReferralPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [type, setType] = useState<ReferralType>('imovel')
  const [referrerName, setReferrerName] = useState('')
  const [referrerPhone, setReferrerPhone] = useState('')
  const [description, setDescription] = useState('')
  const [returnContact, setReturnContact] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('Sessão expirada. Faça login novamente.')
      return
    }

    if (!referrerName.trim()) {
      setErrorMessage('Informe o nome do indicador (porteiro, síndico, cliente, parceiro).')
      return
    }

    if (!referrerPhone.trim()) {
      setErrorMessage('Informe o telefone de contato do indicador.')
      return
    }

    if (!description.trim()) {
      setErrorMessage('Descreva o imóvel captado ou o cliente interessado.')
      return
    }

    if (!returnContact.trim()) {
      setErrorMessage('Informe como dar retorno ao indicador (ex.: WhatsApp, ligação, e-mail).')
      return
    }

    try {
      setIsSubmitting(true)
      const created = await createManualReferral(
        {
          type,
          referrer_name: referrerName.trim(),
          referrer_phone: referrerPhone.trim(),
          description: description.trim(),
          return_contact: returnContact.trim(),
          channel: 'manual',
        },
        user.id,
        user.name,
      )

      toast({
        title: 'Indicação cadastrada com sucesso!',
        description: `Indicação de ${type === 'imovel' ? 'imóvel' : 'cliente'} salva no seu painel.`,
      })

      navigate(`/indicacao/detalhe/${created.id}`)
    } catch (err: unknown) {
      console.error('Erro ao cadastrar indicação:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar indicação.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-2xl">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Painel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif flex items-center gap-2">
            <PlusCircle className="h-7 w-7 text-amber-500" />
            Nova Indicação Manual
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre indicações recebidas diretamente por WhatsApp, ligação, visita presencial ou
            qualquer outro canal.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-lg text-white font-semibold">Dados da Captação</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Preencha as informações do indicador e os detalhes do imóvel ou cliente indicado.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-5">
              {errorMessage && (
                <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Type selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Tipo de Indicação *
                </Label>
                <RadioGroup
                  value={type}
                  onValueChange={(val) => setType(val as ReferralType)}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="type-imovel"
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      type === 'imovel'
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <RadioGroupItem value="imovel" id="type-imovel" className="text-amber-500" />
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Home className="h-4 w-4 text-amber-400" />
                      <span>Imóvel</span>
                    </div>
                  </label>

                  <label
                    htmlFor="type-cliente"
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      type === 'cliente'
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <RadioGroupItem value="cliente" id="type-cliente" className="text-amber-500" />
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Users className="h-4 w-4 text-sky-400" />
                      <span>Cliente Comprador/Locatário</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Referrer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="referrer-name" className="text-xs text-slate-300">
                    Nome do Indicador *
                  </Label>
                  <Input
                    id="referrer-name"
                    placeholder="Ex.: Sr. José (Porteiro Ed. Esmeralda)"
                    value={referrerName}
                    onChange={(e) => setReferrerName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referrer-phone" className="text-xs text-slate-300">
                    Telefone / WhatsApp do Indicador *
                  </Label>
                  <Input
                    id="referrer-phone"
                    placeholder="(11) 98888-7777"
                    value={referrerPhone}
                    onChange={(e) => setReferrerPhone(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs text-slate-300">
                  {type === 'imovel' ? 'Descrição do Imóvel *' : 'Descrição do Cliente / Demanda *'}
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    type === 'imovel'
                      ? 'Ex.: Apartamento 180m², 3 suítes, Rua Oscar Freire. Proprietário quer vender com urgência...'
                      : 'Ex.: Empresário busca cobertura na Vila Nova Conceição ou Itaim, orçamento até 8 milhões...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500 resize-none"
                />
              </div>

              {/* Return contact */}
              <div className="space-y-1.5">
                <Label htmlFor="return-contact" className="text-xs text-slate-300">
                  Contato de Retorno para Feedback *
                </Label>
                <Input
                  id="return-contact"
                  placeholder="Ex.: Chamar no WhatsApp pessoal das 14h às 18h"
                  value={returnContact}
                  onChange={(e) => setReturnContact(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Informações sobre como e quando você deve reportar o andamento da negociação para
                  o indicador.
                </p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Registrar Indicação
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
