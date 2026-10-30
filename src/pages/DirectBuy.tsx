import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Search, CheckCircle2, ArrowRight } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'
import { submitBuyerLead, getPublicFormData, getPublicIndicator } from '@/services/operations'

interface LegalDoc {
  id?: string
  title: string
  version: number
  content: string
  is_provisional?: boolean
}

export default function DirectBuyPage() {
  const [searchParams] = useSearchParams()
  const campaignCode = searchParams.get('c') || ''

  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [intent, setIntent] = useState<'comprar' | 'alugar'>('comprar')
  const [propertyType, setPropertyType] = useState('apartamento')
  const [targetNeighborhood, setTargetNeighborhood] = useState('Barra da Tijuca')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')

  // "Alguém indicou você?"
  const [hasReferrer, setHasReferrer] = useState(false)
  const [referrerInput, setReferrerInput] = useState('')
  const [referrerResolved, setReferrerResolved] = useState<{
    code: string
    name: string
  } | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)

  const [whatsappOptin, setWhatsappOptin] = useState(true)
  const [consentDeclared, setConsentDeclared] = useState(true)
  const [honeypot, setHoneypot] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const formData = await getPublicFormData()
        if (formData.consent) {
          setLegalDoc(formData.consent)
        }
      } catch (err) {
        console.error('Erro ao carregar documentos:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCheckReferrerCode = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase()
    if (!clean) {
      setReferrerResolved(null)
      return
    }

    setCheckingCode(true)
    try {
      const info = await getPublicIndicator(clean)
      if (info && info.ativo) {
        setReferrerResolved({ code: clean, name: info.display_name })
      } else {
        setReferrerResolved(null)
      }
    } catch (_) {
      setReferrerResolved(null)
    } finally {
      setCheckingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim() || !phone.trim()) {
      setFormError('Por favor, informe seu nome e telefone de contato.')
      return
    }

    if (!consentDeclared) {
      setFormError('É necessário autorizar o contato para prosseguir.')
      return
    }

    setSubmitting(true)

    try {
      const finalCode = referrerResolved ? referrerResolved.code : ''
      const finalFreeText =
        !referrerResolved && hasReferrer && referrerInput.trim() ? referrerInput.trim() : ''

      const res = await submitBuyerLead({
        referral_code: finalCode || undefined,
        referrer_free_text: finalFreeText || undefined,
        name,
        phone,
        email,
        intent,
        target_neighborhood: targetNeighborhood,
        property_type: propertyType,
        budget: budget || undefined,
        notes,
        campaign_code: campaignCode,
        source_origin: 'direto',
        whatsapp_optin: whatsappOptin,
        consent_declared: consentDeclared,
        website: honeypot,
      })

      setCreatedProtocol(res.protocol || '#OK')
    } catch (err: any) {
      console.error('Erro ao enviar interesse direto:', err)
      setFormError(err.message || 'Erro ao processar envio. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-gold-deep" strokeWidth={1.5} />
          <p className="text-xs font-sans">Carregando formulário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex-1 py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5 min-w-0">
            <Eyebrow className="justify-center">COMPRADORES · BARRA &amp; RECREIO</Eyebrow>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-foreground break-words">
              Quero Comprar Meu <em>Imóvel</em>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto font-sans">
              Conte com corretores credenciados para encontrar o imóvel ideal nos melhores
              condomínios da Barra da Tijuca e Recreio dos Bandeirantes.
            </p>
          </div>
          {createdProtocol ? (
            <Card className="bg-card border border-border text-card-foreground shadow-luxury text-center rounded-[1px]">
              <CardHeader className="pb-3">
                <Eyebrow className="justify-center">INTERESSE REGISTRADO</Eyebrow>
                <div className="w-14 h-14 bg-success/15 text-success rounded-[1px] flex items-center justify-center mx-auto my-2 border border-success/30">
                  <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-2xl font-serif font-bold text-foreground">
                  Interesse Registrado com <em>Sucesso</em>!
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm font-sans">
                  Um corretor credenciado especialista no perfil desejado entrará em contato com
                  opções selecionadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-[1px] bg-secondary/50 border border-gold-deep/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                    Protocolo do Atendimento
                  </p>
                  <p className="text-3xl font-mono font-bold text-gold-deep">{createdProtocol}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/entrar">Voltar para o Início</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="bg-card border border-border text-card-foreground shadow-sm rounded-[1px]">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                  <Search className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                  Perfil do Imóvel Buscado
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs font-sans">
                  Conte-nos o que você procura para que possamos apresentar as melhores
                  oportunidades.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <CardContent className="space-y-4 pt-4 font-sans">
                  {formError && (
                    <Alert variant="destructive" className="rounded-[1px]">
                      <AlertDescription className="text-xs">{formError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Finalidade */}
                  <div className="space-y-1">
                    <Label htmlFor="intent" className="text-xs font-heading text-foreground">
                      Finalidade
                    </Label>
                    <Select value={intent} onValueChange={(val: any) => setIntent(val)}>
                      <SelectTrigger id="intent" className="text-xs sm:text-sm font-sans">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comprar">Quero comprar um imóvel</SelectItem>
                        <SelectItem value="alugar">Quero alugar um imóvel para morar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dados de Contato */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                      Seus Dados de Contato
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="buyerName" className="text-xs font-heading text-foreground">
                          Nome Completo *
                        </Label>
                        <Input
                          id="buyerName"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Mariana Castro"
                          required
                          className="text-xs sm:text-sm h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="buyerPhone"
                          className="text-xs font-heading text-foreground"
                        >
                          Telefone / WhatsApp *
                        </Label>
                        <Input
                          id="buyerPhone"
                          type="tel"
                          inputMode="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(21) 99999-9999"
                          required
                          className="font-mono text-xs sm:text-sm h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="buyerEmail"
                          className="text-xs font-heading text-foreground"
                        >
                          E-mail (opcional)
                        </Label>
                        <Input
                          id="buyerEmail"
                          type="email"
                          inputMode="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="font-mono text-xs sm:text-sm h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Características Desejadas */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                      Características Desejadas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="pType" className="text-xs font-heading text-foreground">
                          Tipo de Imóvel
                        </Label>
                        <Select value={propertyType} onValueChange={setPropertyType}>
                          <SelectTrigger id="pType" className="text-xs sm:text-sm font-sans">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartamento">Apartamento Padrão</SelectItem>
                            <SelectItem value="cobertura">Cobertura</SelectItem>
                            <SelectItem value="casa">Casa em Condomínio Fechado</SelectItem>
                            <SelectItem value="comercial">Sala / Loja Comercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor="targetNeigh"
                          className="text-xs font-heading text-foreground"
                        >
                          Bairro / Região
                        </Label>
                        <Select value={targetNeighborhood} onValueChange={setTargetNeighborhood}>
                          <SelectTrigger id="targetNeigh" className="text-xs sm:text-sm font-sans">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barra da Tijuca">Barra da Tijuca</SelectItem>
                            <SelectItem value="Recreio dos Bandeirantes">
                              Recreio dos Bandeirantes
                            </SelectItem>
                            <SelectItem value="Ambos">Barra e Recreio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="budget" className="text-xs font-heading text-foreground">
                          {intent === 'comprar'
                            ? 'Orçamento Estimado (R$)'
                            : 'Pretensão de Aluguel (R$)'}
                        </Label>
                        <Input
                          id="budget"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder={
                            intent === 'comprar'
                              ? 'Ex: R$ 2.000.000 a R$ 4.000.000'
                              : 'Ex: R$ 6.000 a R$ 12.000/mês'
                          }
                          className="font-mono text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="notes" className="text-xs font-heading text-foreground">
                          Observações adicionais (opcional)
                        </Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Ex: Mínimo 3 suítes, vista livre, condomínio com infraestrutura completa..."
                          className="text-xs min-h-[70px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CAMPO: ALGUÉM INDICOU VOCÊ? */}
                  <div className="pt-3 border-t border-border space-y-3 bg-secondary/40 p-3 rounded-[1px] border">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="hasReferrer"
                        className="text-xs font-heading font-semibold text-foreground cursor-pointer"
                      >
                        Alguém indicou você?
                      </Label>
                      <Checkbox
                        id="hasReferrer"
                        checked={hasReferrer}
                        onCheckedChange={(c) => {
                          const checked = !!c
                          setHasReferrer(checked)
                          if (!checked) {
                            setReferrerInput('')
                            setReferrerResolved(null)
                          }
                        }}
                        className="rounded-[1px]"
                      />
                    </div>

                    {hasReferrer && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <Label
                            htmlFor="refCode"
                            className="text-[11px] font-heading text-muted-foreground"
                          >
                            Código de Indicação ou Nome de quem indicou
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="refCode"
                              value={referrerInput}
                              onChange={(e) => {
                                const val = e.target.value
                                setReferrerInput(val)
                                handleCheckReferrerCode(val)
                              }}
                              placeholder="Ex: 8X7K2P ou 'Marcos Síndico do London Green'"
                              className="text-xs"
                            />
                            {checkingCode && (
                              <Loader2
                                className="w-4 h-4 animate-spin text-gold-deep self-center"
                                strokeWidth={1.5}
                              />
                            )}
                          </div>
                        </div>

                        {referrerResolved ? (
                          <div className="p-2 rounded-[1px] bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                            <span>
                              Indicador localizado: <strong>{referrerResolved.name}</strong> (Código
                              vinculado na hora)
                            </span>
                          </div>
                        ) : (
                          referrerInput.trim().length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Identificação informada: nossa equipe fará a verificação interna do
                              indicador.
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Consentimento e Opt-in */}
                  <div className="pt-2 space-y-2 bg-secondary/40 p-3 rounded-[1px]">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="consent"
                        checked={consentDeclared}
                        onCheckedChange={(c) => setConsentDeclared(!!c)}
                        className="mt-0.5 rounded-[1px]"
                      />
                      <label
                        htmlFor="consent"
                        className="text-xs text-foreground cursor-pointer leading-tight"
                      >
                        Autorizo o contato da Godoy Prime com opções de imóveis de acordo com o{' '}
                        <button
                          type="button"
                          onClick={() => setShowDocModal(true)}
                          className="text-gold-deep underline font-medium"
                        >
                          Termo de Consentimento e Privacidade (v1)
                        </button>
                        . A apresentação e negociação são conduzidas por corretores com CRECI ativo.
                      </label>
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="optinWa"
                        checked={whatsappOptin}
                        onCheckedChange={(c) => setWhatsappOptin(!!c)}
                        className="mt-0.5 rounded-[1px]"
                      />
                      <label
                        htmlFor="optinWa"
                        className="text-xs text-muted-foreground cursor-pointer leading-tight"
                      >
                        Desejo receber opções preferencialmente via WhatsApp.
                      </label>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end pt-3 border-t border-border">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 h-12 sm:h-9 min-h-[44px] sm:min-h-0"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" strokeWidth={1.5} />
                        Enviando Preferências...
                      </>
                    ) : (
                      <>
                        Buscar Imóveis Disponíveis
                        <ArrowRight className="w-4 h-4 ml-2 shrink-0" strokeWidth={1.5} />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Modal Termo */}
          <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
            <DialogContent className="bg-card border border-border text-card-foreground max-w-lg max-h-[80vh] flex flex-col rounded-[1px]">
              <DialogHeader>
                <DialogTitle className="text-base text-foreground font-serif">
                  {legalDoc?.title || 'Termo de Consentimento e Privacidade'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs font-sans">
                  Governança LGPD Godoy Prime Imóveis.
                </DialogDescription>
              </DialogHeader>
              {legalDoc?.is_provisional && (
                <div className="bg-warning/15 border-l-2 border-warning text-warning px-3 py-2 text-xs font-semibold">
                  Texto provisório, em revisão jurídica.
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 bg-secondary/50 rounded-[1px] border border-border text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                {legalDoc?.content || 'Carregando termo...'}
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDocModal(false)}>
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
