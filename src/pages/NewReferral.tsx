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
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Eyebrow } from '@/components/brand'

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
            `Conforme o regulamento (seções 3.2 e 4.1), participantes da categoria "${category.name}" realizam indicações exclusivamente pelo link pessoal e cartão com QR entregue em mãos ao indicado. O envio direto pelo painel não é permitido para esta categoria.`,
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
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <MemberNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-deep mb-3" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground font-sans">
            Verificando permissões da sua categoria...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-3 sm:px-6 pt-5 sm:pt-8 max-w-2xl space-y-5 sm:space-y-6">
        <div>
          <Link
            to="/painel"
            className="inline-flex items-center text-xs font-heading font-medium text-muted-foreground hover:text-foreground transition-colors mb-3 h-10 sm:h-8 min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1 text-gold-deep shrink-0" strokeWidth={1.5} />
            Voltar ao Painel
          </Link>
          <div className="space-y-1 min-w-0">
            <Eyebrow>PAINEL DO INDICADOR · COMUNICAÇÃO DIRETA</Eyebrow>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-foreground flex items-center gap-2 break-words">
              <PlusCircle className="h-6 w-6 text-gold-deep shrink-0" strokeWidth={1.5} />
              <span>
                Nova Indicação <em>Direta</em>
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans">
              Envio direto autorizado pelo painel para categorias elegíveis da rede Godoy Prime.
            </p>
          </div>
        </div>

        {/* Not allowed banner */}
        {notAllowedReason ? (
          <Card className="bg-card border-border text-card-foreground shadow-luxury p-6 sm:p-8 text-center space-y-4 rounded-[1px]">
            <div className="w-14 h-14 rounded-[1px] bg-secondary border border-border text-gold-deep flex items-center justify-center mx-auto">
              <QrCode className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              Indicação Exclusiva via <em>Link Pessoal ou QR Code</em>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto font-sans">
              {notAllowedReason}
            </p>
            <div className="bg-secondary/40 p-4 rounded-[1px] border border-border text-xs text-muted-foreground text-left space-y-2 font-sans">
              <p className="font-heading font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-gold-deep" strokeWidth={1.5} />
                Como você faz suas indicações:
              </p>
              <p className="leading-relaxed">
                Utilize seu <strong className="text-foreground">
                  cartão pessoal e QR Code
                </strong>{' '}
                para entregar em mãos à pessoa interessada. Ela mesma faz o cadastro pelo link
                oficial e autoriza o contato, garantindo sua recompensa por indicação com total
                conformidade jurídica.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="text-xs sm:text-sm rounded-[1px] h-9">
                <Link to="/painel/materiais">
                  <QrCode className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                  Acessar Meus Materiais &amp; QR Code
                </Link>
              </Button>
              <Button asChild variant="outline" className="text-xs rounded-[1px] h-9">
                <Link to="/painel">Ir para o Painel</Link>
              </Button>
            </div>
          </Card>
        ) : submittedProtocol ? (
          /* Success state */
          <Card className="bg-card border-border text-card-foreground shadow-luxury p-6 sm:p-8 text-center space-y-4 rounded-[1px]">
            <div className="w-14 h-14 rounded-[1px] bg-success/15 border border-success/30 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              Indicação Registrada com <em>Sucesso</em>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto font-sans">
              Protocolo oficial gerado:{' '}
              <span className="font-mono font-bold text-gold-deep">{submittedProtocol}</span>
            </p>
            <div className="bg-secondary/40 p-4 rounded-[1px] border border-border text-xs text-muted-foreground text-left space-y-2 font-sans">
              <p className="font-heading font-semibold text-foreground">Próximos passos:</p>
              <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                <li>
                  Um corretor de imóveis credenciado com CRECI ativo da Godoy Prime fará o primeiro
                  contato com a pessoa indicada.
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
              <Button asChild className="text-xs sm:text-sm rounded-[1px] h-9">
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
                className="text-xs rounded-[1px] h-9"
              >
                Fazer Outra Indicação
              </Button>
            </div>
          </Card>
        ) : (
          /* Form */
          <Card className="bg-card border-border text-card-foreground shadow-luxury rounded-[1px]">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-foreground font-serif font-bold">
                Dados da Pessoa Indicada
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-sans">
                Informe os dados do interessado. Visita, avaliação, negociação e contrato são feitos
                exclusivamente por corretor credenciado com CRECI ativo.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 pt-5 font-sans">
                {errorMessage && (
                  <Alert
                    variant="destructive"
                    className="bg-destructive/15 border-destructive/30 text-destructive text-xs rounded-[1px]"
                  >
                    <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                    <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Type selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-heading font-semibold text-foreground uppercase tracking-wider">
                    Perfil da Indicação *
                  </Label>
                  <RadioGroup
                    value={referralType}
                    onValueChange={(val) =>
                      setReferralType(val as 'proprietario' | 'comprador' | 'proprietario_locacao')
                    }
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-heading"
                  >
                    <label
                      htmlFor="type-prop-venda"
                      className={`flex items-center gap-2.5 p-3 rounded-[1px] border cursor-pointer transition-colors ${
                        referralType === 'proprietario'
                          ? 'border-gold-deep bg-secondary text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <RadioGroupItem value="proprietario" id="type-prop-venda" />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Home className="h-4 w-4 text-gold-deep shrink-0" strokeWidth={1.5} />
                        <span>Proprietário (Venda)</span>
                      </div>
                    </label>

                    <label
                      htmlFor="type-prop-locacao"
                      className={`flex items-center gap-2.5 p-3 rounded-[1px] border cursor-pointer transition-colors ${
                        referralType === 'proprietario_locacao'
                          ? 'border-gold-deep bg-secondary text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <RadioGroupItem value="proprietario_locacao" id="type-prop-locacao" />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Home className="h-4 w-4 text-gold-deep shrink-0" strokeWidth={1.5} />
                        <span>Proprietário (Locação)</span>
                      </div>
                    </label>

                    <label
                      htmlFor="type-comprador"
                      className={`flex items-center gap-2.5 p-3 rounded-[1px] border cursor-pointer transition-colors ${
                        referralType === 'comprador'
                          ? 'border-gold-deep bg-secondary text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <RadioGroupItem value="comprador" id="type-comprador" />
                      <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                        <Users className="h-4 w-4 text-gold-deep shrink-0" strokeWidth={1.5} />
                        <span>Comprador Interessado</span>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* Indicated contact details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="indicated-name"
                      className="text-xs font-heading text-foreground"
                    >
                      Nome da Pessoa Indicada *
                    </Label>
                    <Input
                      id="indicated-name"
                      placeholder="Nome completo ou primeiro nome"
                      value={indicatedName}
                      onChange={(e) => setIndicatedName(e.target.value)}
                      required
                      className="rounded-[1px] text-xs sm:text-sm font-sans h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="indicated-phone"
                      className="text-xs font-heading text-foreground"
                    >
                      Telefone / WhatsApp do Indicado *
                    </Label>
                    <Input
                      id="indicated-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="(21) 98888-7777"
                      value={indicatedPhone}
                      onChange={(e) => setIndicatedPhone(e.target.value)}
                      required
                      className="rounded-[1px] text-xs sm:text-sm font-mono h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="indicated-email"
                      className="text-xs font-heading text-foreground"
                    >
                      E-mail do Indicado (Opcional)
                    </Label>
                    <Input
                      id="indicated-email"
                      type="email"
                      inputMode="email"
                      placeholder="exemplo@email.com"
                      value={indicatedEmail}
                      onChange={(e) => setIndicatedEmail(e.target.value)}
                      className="rounded-[1px] text-xs sm:text-sm font-sans h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="neighborhood" className="text-xs font-heading text-foreground">
                      Região / Bairro do Interesse *
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ex.: Barra da Tijuca, Recreio dos Bandeirantes"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      required
                      className="rounded-[1px] text-xs sm:text-sm font-sans h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-heading text-foreground">
                    Detalhes do Imóvel ou da Procura (Opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex.: Apartamento de 3 quartos que deseja vender, ou cliente procurando casa em condomínio fechado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-[1px] text-xs sm:text-sm font-sans resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Lembre-se: o indicador apenas comunica a oportunidade, não negocia, não fala de
                    preço e não acompanha visita.
                  </p>
                </div>

                {/* Consent Checkbox */}
                <div className="p-3.5 bg-secondary/60 border border-border rounded-[1px] space-y-2 font-sans">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="consent-check"
                      checked={consentDeclared}
                      onCheckedChange={(checked) => setConsentDeclared(!!checked)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <label
                      htmlFor="consent-check"
                      className="text-xs text-foreground leading-relaxed cursor-pointer font-medium"
                    >
                      Declaro que conversei previamente com a pessoa indicada e ela concordou em ser
                      contatada pela Godoy Prime Realty sobre este interesse imobiliário.{' '}
                      <span className="text-gold-deep font-mono text-[11px]">
                        (consent_status: declarado_indicador)
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6 leading-relaxed">
                    No primeiro contato, a Godoy Prime Realty informará quem fez a indicação e
                    oferecerá a opção de recusa. Se a pessoa indicada recusar o contato, seus dados
                    pessoais serão imediatamente excluídos do sistema.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t border-border pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/painel')}
                  disabled={isSubmitting}
                  className="text-xs rounded-[1px] h-11 sm:h-9 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || !consentDeclared}
                  className="text-xs sm:text-sm rounded-[1px] h-12 sm:h-9 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" strokeWidth={1.5} />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Indicação Direta'
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
