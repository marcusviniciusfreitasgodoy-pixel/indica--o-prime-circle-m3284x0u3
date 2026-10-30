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
import { Loader2, Home, CheckCircle2, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'
import { submitOwnerLead, getPublicFormData, getPublicIndicator } from '@/services/operations'

interface Condominium {
  id: string
  name: string
  neighborhood?: string
}

interface LegalDoc {
  id?: string
  title: string
  version: number
  content: string
  is_provisional?: boolean
}

export default function DirectSellPage() {
  const [searchParams] = useSearchParams()
  const campaignCode = searchParams.get('c') || ''
  const navigate = useNavigate()

  const [condos, setCondos] = useState<Condominium[]>([])
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [purpose, setPurpose] = useState<'vender' | 'avaliacao' | 'alugar'>('vender')
  const [condominiumId, setCondominiumId] = useState('')
  const [condominiumName, setCondominiumName] = useState('')
  const [unit, setUnit] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('Barra da Tijuca')
  const [estimatedValue, setEstimatedValue] = useState('')
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
        setCondos(formData.condominiums || [])
        if (formData.consent) {
          setLegalDoc(formData.consent)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Auto-verificar código se o usuário digitar algo que pareça código
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
      const selectedCondoObj = condos.find((c) => c.id === condominiumId)
      const condoNameToUse = selectedCondoObj ? selectedCondoObj.name : condominiumName

      // Se código válido foi resolvido, passa referral_code;
      // se é texto livre, passa referrer_free_text para attribution_status = 'pendente'
      const finalCode = referrerResolved ? referrerResolved.code : ''
      const finalFreeText =
        !referrerResolved && hasReferrer && referrerInput.trim() ? referrerInput.trim() : ''

      const res = await submitOwnerLead({
        referral_code: finalCode || undefined,
        referrer_free_text: finalFreeText || undefined,
        name,
        phone,
        email,
        purpose,
        condominium_id: condominiumId || undefined,
        condominium_name: condoNameToUse || undefined,
        unit: unit || undefined,
        address: address || undefined,
        neighborhood,
        estimated_value: estimatedValue || undefined,
        notes,
        campaign_code: campaignCode,
        source_origin: 'direto',
        whatsapp_optin: whatsappOptin,
        consent_declared: consentDeclared,
        website: honeypot,
      })

      setCreatedProtocol(res.protocol || '#OK')
    } catch (err: any) {
      console.error('Erro ao enviar indicação direta:', err)
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
            <Eyebrow className="justify-center">PROPRIETÁRIOS · BARRA &amp; RECREIO</Eyebrow>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-foreground break-words">
              Quero Vender Meu <em>Imóvel</em>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto font-sans">
              Cadastre seu imóvel para venda ou opinião de valor com a imobiliária de alto padrão na
              Barra da Tijuca e Recreio dos Bandeirantes.
            </p>
          </div>

          {createdProtocol ? (
            <Card className="bg-card border border-border text-card-foreground shadow-luxury text-center rounded-[1px]">
              <CardHeader className="pb-3">
                <Eyebrow className="justify-center">PROTOCOLO GERADO</Eyebrow>
                <div className="w-14 h-14 bg-success/15 text-success rounded-[1px] flex items-center justify-center mx-auto my-2 border border-success/30">
                  <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-2xl font-serif font-bold text-foreground">
                  Solicitação Recebida com <em>Sucesso</em>!
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm font-sans">
                  Nossos corretores especialistas credenciados entrarão em contato em até 24 horas
                  úteis.
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
                  <Home className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                  Formulário do Proprietário
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs font-sans">
                  Preencha os dados do imóvel e seu contato para atendimento por corretor com CRECI
                  ativo.
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

                  {/* Objetivo */}
                  <div className="space-y-1">
                    <Label htmlFor="purpose" className="text-xs font-heading text-foreground">
                      Finalidade Principal
                    </Label>
                    <Select value={purpose} onValueChange={(val: any) => setPurpose(val)}>
                      <SelectTrigger id="purpose" className="text-xs sm:text-sm font-sans">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vender">Quero vender meu imóvel</SelectItem>
                        <SelectItem value="avaliacao">
                          Quero saber quanto vale meu imóvel (Opinião de Valor)
                        </SelectItem>
                        <SelectItem value="alugar">Quero colocar meu imóvel para alugar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dados de Contato */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                      Seus Dados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="leadName" className="text-xs font-heading text-foreground">
                          Nome Completo *
                        </Label>
                        <Input
                          id="leadName"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Roberto Gomes"
                          required
                          className="text-xs sm:text-sm h-11 sm:h-9 min-h-[44px] sm:min-h-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="leadPhone" className="text-xs font-heading text-foreground">
                          Telefone / WhatsApp *
                        </Label>
                        <Input
                          id="leadPhone"
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
                        <Label htmlFor="leadEmail" className="text-xs font-heading text-foreground">
                          E-mail (opcional)
                        </Label>
                        <Input
                          id="leadEmail"
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

                  {/* Imóvel */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                      Localização do Imóvel
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label
                          htmlFor="condoSelect"
                          className="text-xs font-heading text-foreground"
                        >
                          Condomínio (se aplicável)
                        </Label>
                        <Select
                          value={condominiumId}
                          onValueChange={(val) => {
                            setCondominiumId(val)
                            const c = condos.find((item) => item.id === val)
                            if (c) {
                              setCondominiumName(c.name)
                              setNeighborhood(c.neighborhood)
                            }
                          }}
                        >
                          <SelectTrigger id="condoSelect" className="text-xs sm:text-sm font-sans">
                            <SelectValue placeholder="Selecione um condomínio de referência..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {condos.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs font-sans">
                                {c.name} — {c.neighborhood}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!condominiumId && (
                        <div className="space-y-1 sm:col-span-2">
                          <Label
                            htmlFor="condoManual"
                            className="text-xs font-heading text-foreground"
                          >
                            Nome do Condomínio / Edifício
                          </Label>
                          <Input
                            id="condoManual"
                            value={condominiumName}
                            onChange={(e) => setCondominiumName(e.target.value)}
                            placeholder="Ex: Mansões, Península, Rio2..."
                            className="text-xs sm:text-sm"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label
                          htmlFor="neighborhood"
                          className="text-xs font-heading text-foreground"
                        >
                          Bairro
                        </Label>
                        <Select value={neighborhood} onValueChange={setNeighborhood}>
                          <SelectTrigger id="neighborhood" className="text-xs sm:text-sm font-sans">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barra da Tijuca">Barra da Tijuca</SelectItem>
                            <SelectItem value="Recreio dos Bandeirantes">
                              Recreio dos Bandeirantes
                            </SelectItem>
                            <SelectItem value="Outro">Outro bairro no Rio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="unit" className="text-xs font-heading text-foreground">
                          Bloco / Apto (opcional)
                        </Label>
                        <Input
                          id="unit"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder="Ex: Bloco 1, 302"
                          className="text-xs sm:text-sm font-mono"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="estimated" className="text-xs font-heading text-foreground">
                          Expectativa de Valor de Venda (opcional)
                        </Label>
                        <Input
                          id="estimated"
                          value={estimatedValue}
                          onChange={(e) => setEstimatedValue(e.target.value)}
                          placeholder="Ex: R$ 2.800.000"
                          className="font-mono text-xs sm:text-sm"
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
                              placeholder="Ex: 8X7K2P ou 'Carlos Porteiro do Bloco 2'"
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
                              vinculado automaticamente)
                            </span>
                          </div>
                        ) : (
                          referrerInput.trim().length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Identificação manual informada: nossa equipe fará a conciliação
                              interna com a pessoa indicada.
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
                        Autorizo a Godoy Prime a entrar em contato para fins desta opinião de valor
                        ou venda, de acordo com o{' '}
                        <button
                          type="button"
                          onClick={() => setShowDocModal(true)}
                          className="text-gold-deep underline font-medium"
                        >
                          Termo de Consentimento e Privacidade (v1)
                        </button>
                        . A intermediação e avaliação são realizadas por corretores credenciados com
                        CRECI ativo.
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
                        Desejo receber contato prioritário via WhatsApp.
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
                        Enviando Imóvel...
                      </>
                    ) : (
                      <>
                        Enviar para Opinião de Valor / Venda
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
