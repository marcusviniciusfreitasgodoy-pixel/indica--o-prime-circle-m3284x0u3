import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { MemberNavbar } from '@/components/MemberNavbar'
import { submitDirectReferral } from '@/services/referrals'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PlusCircle,
  Home,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ParticipantInfo {
  id: string
  status: string
  referral_code?: string
  category?: {
    name: string
    slug: string
    allowed_channels: string
  }
}

export default function NewReferralPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoadingParticipant, setIsLoadingParticipant] = useState(true)
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null)
  const [notAllowedReason, setNotAllowedReason] = useState<string | null>(null)

  // Form state
  const [referralType, setReferralType] = useState<
    'proprietario' | 'comprador' | 'proprietario_locacao'
  >('proprietario')
  const [indicatedName, setIndicatedName] = useState('')
  const [indicatedPhone, setIndicatedPhone] = useState('')
  const [indicatedEmail, setIndicatedEmail] = useState('')
  const [neighborhood, setNeighborhood] = useState('Barra da Tijuca')
  const [notes, setNotes] = useState('')
  const [consentDeclared, setConsentDeclared] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const checkEligibility = async () => {
      if (!user) {
        setIsLoadingParticipant(false)
        return
      }

      try {
        setIsLoadingParticipant(true)
        const partRec = await pb
          .collection('participants')
          .getFirstListItem(`user_id = '${user.id}'`, { expand: 'category_id' })

        if (!isMounted) return

        const category = partRec.expand?.category_id as
          | { name: string; slug: string; allowed_channels: string }
          | undefined

        setParticipant({
          id: partRec.id,
          status: partRec.status,
          referral_code: partRec.referral_code,
          category: category
            ? {
                name: category.name,
                slug: category.slug,
                allowed_channels: category.allowed_channels,
              }
            : undefined,
        })

        if (partRec.status !== 'ativo') {
          setNotAllowedReason(
            'Seu cadastro de indicador está em aprovação. O envio direto pelo painel só fica liberado após a ativação.',
          )
        } else if (category && category.allowed_channels === 'link_only') {
          setNotAllowedReason(
            `Conforme o regulamento (seção 3.2 e 4.1), participantes da categoria "${category.name}" realizam indicações exclusivamente pelo link pessoal e cartão com QR entregue em mãos ao indicado. O envio direto pelo painel não é permitido para esta categoria.`,
          )
        }
      } catch (err) {
        console.warn('Participante não localizado:', err)
        if (isMounted) {
          setNotAllowedReason(
            'Cadastro de participante não localizado. Complete seu perfil ou acesse o link de convite.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingParticipant(false)
        }
      }
    }

    checkEligibility()
    return () => {
      isMounted = false
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('Sessão expirada. Faça login novamente.')
      return
    }

    if (!indicatedName.trim()) {
      setErrorMessage('Informe o nome da pessoa indicada.')
      return
    }

    if (!indicatedPhone.trim()) {
      setErrorMessage('Informe o telefone / WhatsApp da pessoa indicada.')
      return
    }

    if (!consentDeclared) {
      setErrorMessage(
        'É obrigatório declarar que a pessoa indicada concordou previamente em receber o contato da Godoy Prime Realty.',
      )
      return
    }

    try {
      setIsSubmitting(true)
      const res = await submitDirectReferral({
        referral_type: referralType,
        indicated_name: indicatedName.trim(),
        indicated_phone: indicatedPhone.trim(),
        indicated_email: indicatedEmail.trim() || undefined,
        target_neighborhood: neighborhood.trim() || 'Barra da Tijuca / Recreio',
        notes: notes.trim() || undefined,
        consent_declared: true,
        consent_status: 'declarado_indicador',
      })

      setSubmittedProtocol(res.protocol)
      toast({
        title: 'Indicação registrada com sucesso!',
        description: `Protocolo ${res.protocol}. O corretor com CRECI ativo fará o contato.`,
      })
    } catch (err: unknown) {
      console.error('Erro ao registrar indicação direta:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao enviar indicação direta.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingParticipant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <MemberNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
          <p className="text-sm text-slate-400">Verificando permissões da sua categoria...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-2xl">
        <div className="mb-6">
          <Link
            to="/painel"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Painel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif flex items-center gap-2">
            <PlusCircle className="h-7 w-7 text-amber-500" />
            Nova Indicação Direta
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Envio direto autorizado pelo painel para categorias elegíveis da rede Godoy Prime.
          </p>
        </div>

        {/* Not allowed banner */}
        {notAllowedReason ? (
          <Card className="bg-slate-900 border-amber-500/30 text-slate-100 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <QrCode className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white font-serif">
              Indicação Exclusiva via Link Pessoal ou QR Code
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {notAllowedReason}
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-2">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Como você faz suas indicações:
              </p>
              <p className="leading-relaxed">
                Utilize seu <strong>cartão pessoal e QR Code</strong> para entregar em mãos à pessoa
                interessada. Ela mesma faz o cadastro pelo link oficial e autoriza o contato,
                garantindo sua recompensa por indicação com total conformidade jurídica.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                <Link to="/painel/materiais">
                  <QrCode className="h-4 w-4 mr-1.5" />
                  Acessar Meus Materiais & QR Code
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-700 text-slate-300 text-xs">
                <Link to="/painel">Ir para o Painel</Link>
              </Button>
            </div>
          </Card>
        ) : submittedProtocol ? (
          /* Success state */
          <Card className="bg-slate-900 border-emerald-500/30 text-slate-100 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white font-serif">
              Indicação Registrada com Sucesso!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              Protocolo oficial gerado:{' '}
              <span className="font-mono font-bold text-amber-400">{submittedProtocol}</span>
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-2">
              <p className="font-semibold text-slate-300">Próximos passos:</p>
              <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                <li>
                  Um corretor de imóveis com CRECI ativo da Godoy Prime fará o primeiro contato com
                  a pessoa indicada.
                </li>
                <li>
                  A mensagem inicial informará que você fez a indicação e oferecerá a opção de não
                  ser contatada (caso ela recuse, os dados são apagados).
                </li>
                <li>
                  Você acompanha o progresso da indicação diretamente pela linha do tempo do seu
                  painel.
                </li>
              </ul>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                <Link to="/painel">Ver no Painel</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmittedProtocol(null)
                  setIndicatedName('')
                  setIndicatedPhone('')
                  setIndicatedEmail('')
                  setNotes('')
                  setConsentDeclared(false)
                }}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Fazer Outra Indicação
              </Button>
            </div>
          </Card>
        ) : (
          /* Form */
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg text-white font-semibold">
                Dados da Pessoa Indicada
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Informe os dados do interessado. Visita, avaliação, negociação e contrato são feitos
                exclusivamente por corretor com CRECI ativo.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 pt-5">
                {errorMessage && (
                  <Alert
                    variant="destructive"
                    className="bg-red-950/60 border-red-800 text-red-200"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Type selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Perfil da Indicação *
                  </Label>
                  <RadioGroup
                    value={referralType}
                    onValueChange={(val) =>
                      setReferralType(val as 'proprietario' | 'comprador' | 'proprietario_locacao')
                    }
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                  >
                    <label
                      htmlFor="type-prop-venda"
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        referralType === 'proprietario'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RadioGroupItem
                        value="proprietario"
                        id="type-prop-venda"
                        className="text-amber-500"
                      />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Home className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>Proprietário (Venda)</span>
                      </div>
                    </label>

                    <label
                      htmlFor="type-prop-locacao"
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        referralType === 'proprietario_locacao'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RadioGroupItem
                        value="proprietario_locacao"
                        id="type-prop-locacao"
                        className="text-amber-500"
                      />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Home className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Proprietário (Locação)</span>
                      </div>
                    </label>

                    <label
                      htmlFor="type-comprador"
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        referralType === 'comprador'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <RadioGroupItem
                        value="comprador"
                        id="type-comprador"
                        className="text-amber-500"
                      />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Users className="h-4 w-4 text-sky-400 shrink-0" />
                        <span>Comprador Interessado</span>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* Indicated contact details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="indicated-name" className="text-xs text-slate-300">
                      Nome da Pessoa Indicada *
                    </Label>
                    <Input
                      id="indicated-name"
                      placeholder="Nome completo ou primeiro nome"
                      value={indicatedName}
                      onChange={(e) => setIndicatedName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="indicated-phone" className="text-xs text-slate-300">
                      Telefone / WhatsApp do Indicado *
                    </Label>
                    <Input
                      id="indicated-phone"
                      placeholder="(21) 98888-7777"
                      value={indicatedPhone}
                      onChange={(e) => setIndicatedPhone(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="indicated-email" className="text-xs text-slate-300">
                      E-mail do Indicado (Opcional)
                    </Label>
                    <Input
                      id="indicated-email"
                      type="email"
                      placeholder="exemplo@email.com"
                      value={indicatedEmail}
                      onChange={(e) => setIndicatedEmail(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="neighborhood" className="text-xs text-slate-300">
                      Região / Bairro do Interesse *
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ex.: Barra da Tijuca, Recreio dos Bandeirantes"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs text-slate-300">
                    Detalhes do Imóvel ou da Procura (Opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex.: Apartamento de 3 quartos que deseja vender; ou cliente procurando casa em condomínio fechado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500 resize-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Lembre-se: o indicador apenas comunica a oportunidade; não negocia, não fala de
                    preço e não acompanha visita.
                  </p>
                </div>

                {/* Consent Checkbox */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="consent-check"
                      checked={consentDeclared}
                      onCheckedChange={(checked) => setConsentDeclared(!!checked)}
                      className="mt-0.5 border-amber-500 text-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950"
                    />
                    <label
                      htmlFor="consent-check"
                      className="text-xs text-slate-200 leading-relaxed cursor-pointer font-medium"
                    >
                      Declaro que conversei previamente com a pessoa indicada e ela concordou em ser
                      contatada pela Godoy Prime Realty sobre este interesse imobiliário.{' '}
                      <span className="text-amber-400">(consent_status: declarado_indicador)</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                    No primeiro contato, a Godoy Prime Realty informará quem fez a indicação e
                    oferecerá a opção de recusa. Se a pessoa indicada recusar o contato, seus dados
                    pessoais serão imediatamente excluídos do sistema.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/painel')}
                  disabled={isSubmitting}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || !consentDeclared}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enviar Indicação Direta
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </main>
    </div>
  )
}
