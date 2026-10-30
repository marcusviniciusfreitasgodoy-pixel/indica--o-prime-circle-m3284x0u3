import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
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
import {
  Loader2,
  Home,
  DollarSign,
  Key,
  Search,
  Building,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  UserCheck,
} from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'
import {
  getPublicIndicator,
  getPublicFormData,
  submitOwnerLead,
  submitBuyerLead,
  PublicIndicatorInfo,
} from '@/services/operations'

type ActionOptionKey = 'quanto_vale' | 'vender' | 'colocar_alugar' | 'comprar' | 'alugar_morar'

interface Condominium {
  id: string
  name: string
  neighborhood?: string
}

interface LegalDoc {
  title: string
  version: number
  content: string
  is_provisional?: boolean
}

export default function IndicatorLinkPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const [searchParams] = useSearchParams()
  const campaignCode = searchParams.get('c') || ''
  const navigate = useNavigate()

  const [indicator, setIndicator] = useState<PublicIndicatorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected Option
  const [selectedOption, setSelectedOption] = useState<ActionOptionKey | null>(null)

  // Form states
  const [condos, setCondos] = useState<Condominium[]>([])
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [showDocModal, setShowDocModal] = useState(false)

  // Common lead fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [whatsappOptin, setWhatsappOptin] = useState(true)
  const [consentDeclared, setConsentDeclared] = useState(true)
  const [honeypot, setHoneypot] = useState('')

  // Specific owner fields
  const [condominiumId, setCondominiumId] = useState('')
  const [condominiumName, setCondominiumName] = useState('')
  const [unit, setUnit] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('Barra da Tijuca')
  const [estimatedValue, setEstimatedValue] = useState('')

  // Specific buyer/tenant fields
  const [propertyType, setPropertyType] = useState('apartamento')
  const [budget, setBudget] = useState('')
  const [targetNeighborhood, setTargetNeighborhood] = useState('Barra da Tijuca')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInitial() {
      if (!codigo) {
        setError('Código de indicação não fornecido.')
        setLoading(false)
        return
      }

      try {
        const [info, formData] = await Promise.all([
          getPublicIndicator(codigo),
          getPublicFormData(),
        ])
        setIndicator(info)
        setCondos(formData.condominiums || [])
        if (formData.consent) {
          setLegalDoc(formData.consent)
        }
      } catch (err: any) {
        console.error('Erro ao resolver indicador:', err)
        setError(err.message || 'Código de indicador inválido ou não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [codigo])

  // Five exact text options demanded by specification
  const optionsList: {
    key: ActionOptionKey
    label: string
    sublabel: string
    icon: any
    type: 'proprietario' | 'comprador_inquilino'
  }[] = [
    {
      key: 'quanto_vale',
      label: 'Quero saber quanto vale meu imóvel',
      sublabel: 'Avaliação mercadológica precisa para venda ou locação na Barra e Recreio.',
      icon: DollarSign,
      type: 'proprietario',
    },
    {
      key: 'vender',
      label: 'Quero vender meu imóvel',
      sublabel: 'Divulgação qualificada e curadoria exclusiva de clientes compradores.',
      icon: Home,
      type: 'proprietario',
    },
    {
      key: 'colocar_alugar',
      label: 'Quero colocar meu imóvel para alugar',
      sublabel: 'Gestão segura de locação residencial com garantia e análise rigorosa.',
      icon: Key,
      type: 'proprietario',
    },
    {
      key: 'comprar',
      label: 'Quero comprar um imóvel',
      sublabel: 'Assessoria completa para encontrar o imóvel ideal de alto padrão.',
      icon: Search,
      type: 'comprador_inquilino',
    },
    {
      key: 'alugar_morar',
      label: 'Quero alugar um imóvel para morar',
      sublabel: 'Melhores opções de locação residencial na Barra da Tijuca e Recreio.',
      icon: Building,
      type: 'comprador_inquilino',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim() || !phone.trim()) {
      setFormError('Por favor, informe seu nome e telefone de contato.')
      return
    }

    if (!consentDeclared) {
      setFormError('É necessário declarar o consentimento de contato para prosseguir.')
      return
    }

    setSubmitting(true)

    try {
      let protocol = ''
      const selectedCondoObj = condos.find((c) => c.id === condominiumId)
      const condoNameToUse = selectedCondoObj ? selectedCondoObj.name : condominiumName

      // Decide routing:
      // Proprietário: quanto_vale, vender, colocar_alugar -> submit-owner-lead
      // Comprador/inquilino: comprar, alugar_morar -> submit-buyer-lead
      if (
        selectedOption === 'quanto_vale' ||
        selectedOption === 'vender' ||
        selectedOption === 'colocar_alugar'
      ) {
        let purpose: 'avaliacao' | 'vender' | 'alugar' = 'vender'
        if (selectedOption === 'quanto_vale') purpose = 'avaliacao'
        if (selectedOption === 'colocar_alugar') purpose = 'alugar'

        const res = await submitOwnerLead({
          referral_code: codigo,
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
          source_origin: 'link',
          whatsapp_optin: whatsappOptin,
          consent: consentDeclared,
          consent_declared: consentDeclared,
          website: honeypot,
        })
        protocol = res.protocol || '#OK'
      } else {
        const intent: 'comprar' | 'alugar' =
          selectedOption === 'alugar_morar' ? 'alugar' : 'comprar'

        const res = await submitBuyerLead({
          referral_code: codigo,
          name,
          phone,
          email,
          intent,
          target_neighborhood: targetNeighborhood,
          property_type: propertyType,
          budget: budget || undefined,
          notes,
          campaign_code: campaignCode,
          source_origin: 'link',
          whatsapp_optin: whatsappOptin,
          consent: consentDeclared,
          consent_declared: consentDeclared,
          website: honeypot,
        })
        protocol = res.protocol || '#OK'
      }

      // Redireciona para /i/:codigo/obrigado com o protocolo gerado
      const cleanProto = protocol.replace('#', '')
      navigate(`/i/${codigo}/obrigado?protocolo=${encodeURIComponent(cleanProto)}`)
    } catch (err: any) {
      console.error('Erro ao enviar indicação:', err)
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
          <p className="text-xs font-sans">Localizando indicador e preparando opções...</p>
        </div>
      </div>
    )
  }

  if (error || !indicator) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <BrandPublicHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="max-w-md w-full bg-card border border-border text-center rounded-[1px] shadow-luxury">
            <CardHeader>
              <Eyebrow className="justify-center">LINK INVÁLIDO</Eyebrow>
              <CardTitle className="text-xl font-serif text-destructive mt-2">
                Link Não <em>Encontrado</em>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs font-sans">
                {error || 'O código de indicação informado não existe ou está inativo.'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate('/entrar')} className="w-full sm:w-auto">
                Ir para o Início
              </Button>
            </CardFooter>
          </Card>
        </main>
        <BrandPublicFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Personalizado com Primeiro Nome do Indicador ou Nome da Entidade */}
          <div className="text-center space-y-3">
            <Eyebrow className="justify-center">BARRA DA TIJUCA &amp; RECREIO</Eyebrow>

            <div className="p-4 rounded-[1px] bg-card border border-border shadow-sm flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-[1px] bg-secondary text-gold-deep flex items-center justify-center border border-border">
                <UserCheck className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-left font-sans">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                  Você foi indicado por
                </p>
                <h2 className="text-lg font-serif font-bold text-foreground">
                  {indicator.display_name}
                </h2>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Como a Godoy Prime pode <em>ajudar você</em> hoje?
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto font-sans">
              Selecione uma das opções abaixo para receber atendimento consultivo de corretores
              credenciados com CRECI ativo.
            </p>
          </div>

          {/* 5 OPÇÕES EXATAS */}
          {!selectedOption ? (
            <div className="grid grid-cols-1 gap-3">
              {optionsList.map((opt) => {
                const IconComp = opt.icon
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedOption(opt.key)}
                    className="w-full text-left p-4 rounded-[1px] bg-card hover:bg-secondary/60 border border-border hover:border-gold-deep transition-all group flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-[1px] bg-secondary border border-border flex items-center justify-center text-gold-deep group-hover:text-gold transition-colors flex-shrink-0">
                      <IconComp className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-heading font-semibold text-foreground group-hover:text-gold-deep transition-colors">
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                        {opt.sublabel}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-5 h-5 text-muted-foreground group-hover:text-gold-deep group-hover:translate-x-1 transition-all flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  </button>
                )
              })}
            </div>
          ) : (
            /* Formulário Específico da Opção Escolhida */
            <Card className="bg-card border border-border text-card-foreground shadow-luxury rounded-[1px]">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading text-gold-deep uppercase tracking-wider">
                    Etapa 2 de 2 • Formulário de Atendimento
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedOption(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline font-heading"
                  >
                    Trocar opção
                  </button>
                </div>
                <CardTitle className="text-xl font-serif font-bold text-foreground pt-1">
                  {optionsList.find((o) => o.key === selectedOption)?.label}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs font-sans">
                  Preencha seus dados para que um corretor credenciado da Godoy Prime entre em
                  contato.
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

                  {/* Dados de Contato */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                      Seus Dados de Contato
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="leadName" className="text-xs font-heading text-foreground">
                          Seu Nome Completo *
                        </Label>
                        <Input
                          id="leadName"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          required
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="leadPhone" className="text-xs font-heading text-foreground">
                          Telefone / WhatsApp *
                        </Label>
                        <Input
                          id="leadPhone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(21) 99999-9999"
                          required
                          className="font-mono text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="leadEmail" className="text-xs font-heading text-foreground">
                          E-mail (opcional)
                        </Label>
                        <Input
                          id="leadEmail"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="font-mono text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campos do Imóvel para PROPRIETÁRIO */}
                  {(selectedOption === 'quanto_vale' ||
                    selectedOption === 'vender' ||
                    selectedOption === 'colocar_alugar') && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                        Dados do Imóvel
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="condo" className="text-xs font-heading text-foreground">
                            Condomínio de Referência (se houver)
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
                            <SelectTrigger id="condo" className="text-xs sm:text-sm font-sans">
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
                              Ou digite o nome do condomínio / edifício
                            </Label>
                            <Input
                              id="condoManual"
                              value={condominiumName}
                              onChange={(e) => setCondominiumName(e.target.value)}
                              placeholder="Ex: Condomínio Pedra de Itaúna"
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
                            <SelectTrigger id="neighborhood" className="text-xs sm:text-sm">
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
                            Bloco / Apto / Unidade (opcional)
                          </Label>
                          <Input
                            id="unit"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="Ex: Bloco 2, Apto 504"
                            className="text-xs sm:text-sm font-mono"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="address" className="text-xs font-heading text-foreground">
                            Endereço do Imóvel (opcional)
                          </Label>
                          <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Ex: Av. Lúcio Costa, 3000"
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        {selectedOption === 'vender' && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label
                              htmlFor="estimated"
                              className="text-xs font-heading text-foreground"
                            >
                              Expectativa de Valor para Venda (opcional)
                            </Label>
                            <Input
                              id="estimated"
                              value={estimatedValue}
                              onChange={(e) => setEstimatedValue(e.target.value)}
                              placeholder="Ex: R$ 2.500.000"
                              className="font-mono text-xs sm:text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Campos de Interesse para COMPRADOR OU INQUILINO */}
                  {(selectedOption === 'comprar' || selectedOption === 'alugar_morar') && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <h3 className="text-xs uppercase tracking-wider font-heading font-semibold text-gold-deep">
                        Perfil do Imóvel Desejado
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label
                            htmlFor="propertyType"
                            className="text-xs font-heading text-foreground"
                          >
                            Tipo de Imóvel
                          </Label>
                          <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger id="propertyType" className="text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apartamento">Apartamento Padrão</SelectItem>
                              <SelectItem value="cobertura">Cobertura</SelectItem>
                              <SelectItem value="casa">Casa em Condomínio</SelectItem>
                              <SelectItem value="comercial">Sala / Loja Comercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor="targetNeighborhood"
                            className="text-xs font-heading text-foreground"
                          >
                            Bairro de Preferência
                          </Label>
                          <Select value={targetNeighborhood} onValueChange={setTargetNeighborhood}>
                            <SelectTrigger id="targetNeighborhood" className="text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Barra da Tijuca">Barra da Tijuca</SelectItem>
                              <SelectItem value="Recreio dos Bandeirantes">
                                Recreio dos Bandeirantes
                              </SelectItem>
                              <SelectItem value="Ambos">Tanto Barra quanto Recreio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="budget" className="text-xs font-heading text-foreground">
                            {selectedOption === 'comprar'
                              ? 'Orçamento Previsto (R$)'
                              : 'Pretensão de Aluguel Mensal (R$)'}
                          </Label>
                          <Input
                            id="budget"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder={
                              selectedOption === 'comprar'
                                ? 'Ex: R$ 1.500.000 a R$ 3.000.000'
                                : 'Ex: R$ 5.000 a R$ 10.000/mês'
                            }
                            className="font-mono text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observações Livres */}
                  <div className="space-y-1 pt-2">
                    <Label htmlFor="notes" className="text-xs font-heading text-foreground">
                      Observações adicionais (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Conte mais sobre o que procura, características do imóvel ou melhor horário para contato..."
                      className="text-xs min-h-[70px]"
                    />
                  </div>

                  {/* Consentimento e Opt-in WhatsApp */}
                  <div className="pt-3 border-t border-border space-y-2 bg-secondary/40 p-3 rounded-[1px]">
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
                        Autorizo o contato da equipe Godoy Prime Imóveis para os fins desta
                        solicitação, em conformidade com o{' '}
                        <button
                          type="button"
                          onClick={() => setShowDocModal(true)}
                          className="text-gold-deep underline font-medium"
                        >
                          Termo de Consentimento e Privacidade (v1)
                        </button>
                        . Visitas, avaliações e negociações serão conduzidas por corretor
                        credenciado com CRECI ativo.
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
                        Desejo ser atendido preferencialmente via WhatsApp neste número.
                      </label>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedOption(null)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Voltar
                  </Button>

                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto px-6">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                        Enviando Solicitação...
                      </>
                    ) : (
                      <>
                        Enviar Solicitação
                        <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Modal do Termo de Consentimento */}
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
