import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPublicMemberInfo, submitPublicReferral } from '@/services/referrals'
import { PublicMemberInfo, ReferralType } from '@/types/referral'
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
import {
  Sparkles,
  Building2,
  Phone,
  Home,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Send,
  Plus,
} from 'lucide-react'

export default function PublicCapturePage() {
  const { slugOrId } = useParams<{ slugOrId: string }>()

  const [member, setMember] = useState<PublicMemberInfo | null>(null)
  const [isLoadingMember, setIsLoadingMember] = useState(true)
  const [memberNotFound, setMemberNotFound] = useState(false)

  // Form state
  const [type, setType] = useState<ReferralType>('imovel')
  const [referrerName, setReferrerName] = useState('')
  const [referrerPhone, setReferrerPhone] = useState('')
  const [description, setDescription] = useState('')
  const [returnContact, setReturnContact] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadMember = useCallback(async () => {
    if (!slugOrId) {
      setMemberNotFound(true)
      setIsLoadingMember(false)
      return
    }

    try {
      setIsLoadingMember(true)
      const data = await getPublicMemberInfo(slugOrId)
      setMember(data)
    } catch (err) {
      console.error('Membro não encontrado:', err)
      setMemberNotFound(true)
    } finally {
      setIsLoadingMember(false)
    }
  }, [slugOrId])

  useEffect(() => {
    loadMember()
  }, [loadMember])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!member) {
      setErrorMessage('Membro destinatário não identificado.')
      return
    }

    if (!referrerName.trim()) {
      setErrorMessage('Por favor, informe seu nome.')
      return
    }

    if (!referrerPhone.trim()) {
      setErrorMessage('Por favor, informe seu telefone de contato.')
      return
    }

    if (!description.trim()) {
      setErrorMessage('Por favor, detalhe o imóvel ou o cliente que está indicando.')
      return
    }

    if (!returnContact.trim()) {
      setErrorMessage(
        'Informe a melhor forma ou horário para o corretor entrar em contato com você.',
      )
      return
    }

    try {
      setIsSubmitting(true)
      await submitPublicReferral({
        memberIdentifier: member.public_slug || member.id,
        type,
        referrer_name: referrerName.trim(),
        referrer_phone: referrerPhone.trim(),
        description: description.trim(),
        return_contact: returnContact.trim(),
      })

      setSubmittedSuccess(true)
    } catch (err: unknown) {
      console.error('Erro no envio da indicação:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao enviar indicação. Tente novamente.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setType('imovel')
    setReferrerName('')
    setReferrerPhone('')
    setDescription('')
    setReturnContact('')
    setSubmittedSuccess(false)
    setErrorMessage(null)
  }

  if (isLoadingMember) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm text-slate-400">Carregando página de indicação Prime Circle...</p>
      </div>
    )
  }

  if (memberNotFound || !member) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Página de Indicação Não Encontrada</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          O link de membro informado não existe ou foi alterado. Verifique o link com o corretor
          responsável.
        </p>
        <Button asChild variant="outline" className="border-slate-800 text-slate-300">
          <Link to="/login">Área Restrita de Membros</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400 block mb-1">
            Programa de Parceria & Indicações
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            Prime Circle Indica
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Canal oficial para porteiros, síndicos, zeladores, clientes e parceiros indicarem
            imóveis e compradores.
          </p>
        </div>

        {/* Member profile highlight */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 mb-6 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
              {member.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                Você está indicando para
              </span>
              <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
                {member.name}
              </h3>
              {member.agency && (
                <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 inline" />
                  {member.agency}
                </p>
              )}
            </div>
          </div>
          {member.phone && (
            <div className="hidden sm:block text-right text-xs text-slate-400">
              <span className="block text-[10px] text-slate-500">Contato direto</span>
              <span className="text-slate-200 font-medium">{member.phone}</span>
            </div>
          )}
        </div>

        {/* Form Card or Success State */}
        {submittedSuccess ? (
          <Card className="bg-slate-900 border-emerald-500/30 text-slate-100 shadow-2xl overflow-hidden text-center p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-serif">
              Indicação Enviada com Sucesso!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto mb-6">
              Agradecemos a sua parceria! Os dados foram encaminhados diretamente para o painel de{' '}
              <strong className="text-amber-400">{member.name}</strong>, que dará o retorno conforme
              combinado.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 mb-6 text-left space-y-1">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Compromisso Prime Circle
              </p>
              <p className="leading-relaxed">
                Nossa rede preza pelo atendimento transparente e pelo feedback constante para cada
                um de nossos parceiros indicadores.
              </p>
            </div>

            <Button
              onClick={handleResetForm}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Enviar Outra Indicação
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg text-white font-semibold">
                Formulário de Indicação
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Não é necessário criar conta. Preencha os campos abaixo para registrar sua
                indicação.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-5">
                {errorMessage && (
                  <Alert
                    variant="destructive"
                    className="bg-red-950/60 border-red-800 text-red-200"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Type selection: Imóvel or Cliente */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    O que você gostaria de indicar? *
                  </Label>
                  <RadioGroup
                    value={type}
                    onValueChange={(val) => setType(val as ReferralType)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label
                      htmlFor="pub-type-imovel"
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        type === 'imovel'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RadioGroupItem
                        value="imovel"
                        id="pub-type-imovel"
                        className="text-amber-500"
                      />
                      <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm">
                        <Home className="h-4 w-4 text-amber-400" />
                        <span>Imóvel à Venda/Locação</span>
                      </div>
                    </label>

                    <label
                      htmlFor="pub-type-cliente"
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        type === 'cliente'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RadioGroupItem
                        value="cliente"
                        id="pub-type-cliente"
                        className="text-amber-500"
                      />
                      <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm">
                        <Users className="h-4 w-4 text-sky-400" />
                        <span>Cliente Interessado</span>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* Referrer's Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pub-referrer-name" className="text-xs text-slate-300">
                      Seu Nome *
                    </Label>
                    <Input
                      id="pub-referrer-name"
                      placeholder="Ex.: Francisco (Porteiro Ed. Veneza)"
                      value={referrerName}
                      onChange={(e) => setReferrerName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pub-referrer-phone" className="text-xs text-slate-300">
                      Seu Telefone / WhatsApp *
                    </Label>
                    <Input
                      id="pub-referrer-phone"
                      placeholder="(11) 99999-8888"
                      value={referrerPhone}
                      onChange={(e) => setReferrerPhone(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Description of property or client */}
                <div className="space-y-1.5">
                  <Label htmlFor="pub-description" className="text-xs text-slate-300">
                    {type === 'imovel'
                      ? 'Descrição do Imóvel *'
                      : 'Descrição do Cliente / O que ele procura *'}
                  </Label>
                  <Textarea
                    id="pub-description"
                    placeholder={
                      type === 'imovel'
                        ? 'Ex.: Apartamento 42 no 4º andar vai ser desocupado no final do mês. Proprietário quer vender. 2 vagas, varanda...'
                        : 'Ex.: Morador do 8º andar comentou que quer comprar uma casa em condomínio fechado para a família...'
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
                  <Label htmlFor="pub-return-contact" className="text-xs text-slate-300">
                    Contato de Retorno *
                  </Label>
                  <Input
                    id="pub-return-contact"
                    placeholder="Ex.: Pode me chamar no WhatsApp qualquer horário / Ligar à tarde"
                    value={returnContact}
                    onChange={(e) => setReturnContact(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Como você prefere que o corretor fale com você para atualizar sobre a indicação.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400 text-center sm:text-left">
                  Seus dados estão protegidos pela rede Prime Circle.
                </p>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Indicação
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p>Prime Circle • Rede Colaborativa de Corretores e Imobiliárias</p>
          <p className="text-[11px]">
            É membro da rede?{' '}
            <Link to="/login" className="text-amber-400 hover:underline font-medium">
              Acesse o Painel
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
