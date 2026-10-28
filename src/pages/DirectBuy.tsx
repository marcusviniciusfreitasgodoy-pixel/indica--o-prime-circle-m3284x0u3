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
import pb from '@/lib/pocketbase/client'
import { submitBuyerLead } from '@/services/operations'

interface LegalDoc {
  slug: string
  title: string
  version: number
  content: string
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
        const docs = await pb.collection('legal_documents').getFullList<LegalDoc>({
          filter: "slug = 'consentimento_proprietario' && is_active = true",
          sort: '-version',
        })
        if (docs.length > 0) setLegalDoc(docs[0])
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
      const participant = await pb
        .collection('participants')
        .getFirstListItem(`referral_code = "${clean}" && status = "ativo"`, {
          expand: 'user_id',
        })
      if (participant) {
        const u = participant.expand?.user_id as any
        const firstName = u?.name ? u.name.split(' ')[0] : 'Indicador'
        setReferrerResolved({ code: clean, name: firstName })
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Carregando formulário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            Godoy Prime Imóveis • Barra & Recreio
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Quero Comprar um Imóvel
          </h1>
          <p className="text-neutral-400 text-sm max-w-lg mx-auto">
            Encontre o imóvel ideal na Barra da Tijuca e Recreio dos Bandeirantes com curadoria de
            alto padrão.
          </p>
        </div>

        {createdProtocol ? (
          <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 shadow-xl text-center">
            <CardHeader className="pb-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Interesse Registrado com Sucesso!
              </CardTitle>
              <CardDescription className="text-neutral-300">
                Um consultor especialista no perfil desejado entrará em contato com opções
                selecionadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-mono">
                  Protocolo do Atendimento
                </p>
                <p className="text-3xl font-mono font-bold text-amber-400">{createdProtocol}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold"
              >
                <Link to="/entrar">Voltar para o Início</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 shadow-xl">
            <CardHeader className="border-b border-neutral-800 pb-4">
              <CardTitle className="text-lg text-neutral-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                Perfil do Imóvel Buscado
              </CardTitle>
              <CardDescription className="text-neutral-400 text-xs">
                Conte-nos o que você procura para que possamos apresentar as melhores oportunidades.
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

              <CardContent className="space-y-4 pt-4">
                {formError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-950/50 border-red-800 text-red-200"
                  >
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {/* Finalidade */}
                <div className="space-y-1">
                  <Label htmlFor="intent" className="text-xs">
                    Finalidade
                  </Label>
                  <Select value={intent} onValueChange={(val: any) => setIntent(val)}>
                    <SelectTrigger
                      id="intent"
                      className="bg-neutral-950 border-neutral-700 text-neutral-100"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                      <SelectItem value="comprar">Quero comprar um imóvel</SelectItem>
                      <SelectItem value="alugar">Quero alugar um imóvel para morar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dados de Contato */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-neutral-300">Seus Dados de Contato</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="buyerName" className="text-xs">
                        Nome Completo *
                      </Label>
                      <Input
                        id="buyerName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Mariana Castro"
                        required
                        className="bg-neutral-950 border-neutral-700 text-neutral-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="buyerPhone" className="text-xs">
                        Telefone / WhatsApp *
                      </Label>
                      <Input
                        id="buyerPhone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(21) 99999-9999"
                        required
                        className="bg-neutral-950 border-neutral-700 text-neutral-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="buyerEmail" className="text-xs">
                        E-mail (opcional)
                      </Label>
                      <Input
                        id="buyerEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="bg-neutral-950 border-neutral-700 text-neutral-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Características Desejadas */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <h3 className="text-sm font-semibold text-neutral-300">
                    Características Desejadas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="pType" className="text-xs">
                        Tipo de Imóvel
                      </Label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger
                          id="pType"
                          className="bg-neutral-950 border-neutral-700 text-neutral-100"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                          <SelectItem value="apartamento">Apartamento Padrão</SelectItem>
                          <SelectItem value="cobertura">Cobertura</SelectItem>
                          <SelectItem value="casa">Casa em Condomínio Fechado</SelectItem>
                          <SelectItem value="comercial">Sala / Loja Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="targetNeigh" className="text-xs">
                        Bairro / Região
                      </Label>
                      <Select value={targetNeighborhood} onValueChange={setTargetNeighborhood}>
                        <SelectTrigger
                          id="targetNeigh"
                          className="bg-neutral-950 border-neutral-700 text-neutral-100"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                          <SelectItem value="Barra da Tijuca">Barra da Tijuca</SelectItem>
                          <SelectItem value="Recreio dos Bandeirantes">
                            Recreio dos Bandeirantes
                          </SelectItem>
                          <SelectItem value="Ambos">Barra e Recreio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="budget" className="text-xs">
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
                        className="bg-neutral-950 border-neutral-700 text-neutral-100"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="notes" className="text-xs">
                        Observações adicionais (opcional)
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Mínimo 3 suítes, vista livre, condomínio com infraestrutura completa..."
                        className="bg-neutral-950 border-neutral-700 text-neutral-100 text-xs min-h-[70px]"
                      />
                    </div>
                  </div>
                </div>

                {/* CAMPO: ALGUÉM INDICOU VOCÊ? */}
                <div className="pt-3 border-t border-neutral-800 space-y-3 bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="hasReferrer"
                      className="text-xs font-semibold text-neutral-200 cursor-pointer"
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
                    />
                  </div>

                  {hasReferrer && (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <Label htmlFor="refCode" className="text-[11px] text-neutral-400">
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
                            className="bg-neutral-900 border-neutral-700 text-neutral-100 text-xs"
                          />
                          {checkingCode && (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500 self-center" />
                          )}
                        </div>
                      </div>

                      {referrerResolved ? (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Indicador localizado: <strong>{referrerResolved.name}</strong> (Código
                            vinculado na hora)
                          </span>
                        </div>
                      ) : (
                        referrerInput.trim().length > 0 && (
                          <p className="text-[11px] text-neutral-400">
                            Identificação informada: nossa equipe fará a verificação interna do
                            indicador.
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Consentimento e Opt-in */}
                <div className="pt-2 space-y-2 bg-neutral-950/40 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="consent"
                      checked={consentDeclared}
                      onCheckedChange={(c) => setConsentDeclared(!!c)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="consent"
                      className="text-xs text-neutral-300 cursor-pointer leading-tight"
                    >
                      Autorizo o contato da Godoy Prime com opções de imóveis de acordo com o{' '}
                      <button
                        type="button"
                        onClick={() => setShowDocModal(true)}
                        className="text-amber-400 underline font-medium hover:text-amber-300"
                      >
                        Termo de Consentimento e Privacidade (v1)
                      </button>
                      .
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="optinWa"
                      checked={whatsappOptin}
                      onCheckedChange={(c) => setWhatsappOptin(!!c)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="optinWa"
                      className="text-xs text-neutral-300 cursor-pointer leading-tight"
                    >
                      Desejo receber opções preferencialmente via WhatsApp.
                    </label>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end pt-3 border-t border-neutral-800">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-8"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando Preferências...
                    </>
                  ) : (
                    <>
                      Buscar Imóveis Disponíveis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Modal Termo */}
        <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base text-amber-400">
                {legalDoc?.title || 'Termo de Consentimento e Privacidade'}
              </DialogTitle>
              <DialogDescription className="text-neutral-400 text-xs">
                Governança LGPD Godoy Prime Imóveis.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-3 bg-neutral-950 rounded border border-neutral-800 text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed">
              {legalDoc?.content || 'Carregando termo...'}
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocModal(false)}
                className="border-neutral-700 hover:bg-neutral-800 text-neutral-200"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
