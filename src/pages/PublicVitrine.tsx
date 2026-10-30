import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { submitBuyerLead, getPublicVitrineProperty } from '@/services/operations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Building,
  MapPin,
  ExternalLink,
  Send,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Phone,
  Mail,
  User,
} from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

export function PublicVitrinePage() {
  const { codigo, imovel } = useParams<{ codigo: string; imovel: string }>()
  const { toast } = useToast()

  const [property, setProperty] = useState<{
    id: string
    condo_name: string
    neighborhood: string
    public_summary: string
    public_photos: string[]
    listing_link?: string
    is_reserved_listing: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Buyer Lead Form
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerNotes, setBuyerNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadProperty() {
      if (!imovel) return
      try {
        setLoading(true)
        // Public vitrine displays property in em_divulgacao via safe endpoint
        // NUNCA exibe unidade nem endereço completo por exigência de privacidade
        const res = await getPublicVitrineProperty(imovel)
        setProperty(res)
      } catch (err: any) {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    loadProperty()
  }, [imovel])

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo || !buyerName.trim() || !buyerPhone.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, informe seu nome e telefone para contato.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await submitBuyerLead({
        referral_code: codigo,
        property_referral_id: property?.id,
        name: buyerName.trim(),
        phone: buyerPhone.trim(),
        email: buyerEmail.trim(),
        notes: buyerNotes.trim(),
      })

      setSubmitted(true)
      toast({
        title: 'Interesse registrado!',
        description: 'A equipe da Godoy Prime Realty entrará em contato em breve.',
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao registrar interesse',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-gold-deep mr-3" strokeWidth={1.5} />
        <span className="text-muted-foreground text-xs">Carregando imóvel da vitrine...</span>
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <BrandPublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center font-sans">
          <Building className="w-12 h-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h1 className="font-serif text-2xl text-foreground font-semibold">
            Imóvel <em>não encontrado</em>
          </h1>
          <p className="text-muted-foreground text-xs mt-2 max-w-md">
            Este imóvel pode ter sido negociado, retirado ou o link informado está incorreto.
          </p>
        </main>
        <BrandPublicFooter />
      </div>
    )
  }

  const condoName = property.condo_name || 'Condomínio de Alto Padrão'
  const neighborhood = property.neighborhood || 'Barra da Tijuca / Recreio'
  const photos = property.public_photos || []

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <BrandPublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Eyebrow>VITRINE DE IMÓVEIS · BARRA &amp; RECREIO</Eyebrow>
          <Badge variant="outline" className="rounded-[1px] text-xs font-mono">
            Parceria Oficial · Código #{codigo}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Imóvel Resumo e Fotos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-secondary text-foreground border-border rounded-[1px] text-xs font-heading">
                  Disponível para Visitas
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gold-deep" strokeWidth={1.5} />
                  {neighborhood}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold leading-tight">
                {condoName}
              </h1>
              <p className="text-sm text-muted-foreground font-sans">
                Região nobre da {neighborhood}, Rio de Janeiro - RJ
              </p>
            </div>

            {/* Photos carousel or fallback image */}
            <div className="aspect-video bg-secondary/40 border border-border overflow-hidden relative rounded-[1px]">
              {photos.length > 0 ? (
                <img src={photos[0]} alt={condoName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 p-6 text-center space-y-2">
                  <Building className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-sm text-foreground font-serif">
                    Imóvel de Alto Padrão em {condoName}
                  </span>
                  <span className="text-xs text-muted-foreground max-w-sm font-sans">
                    Fotos e tour privativo sob consulta com nossos corretores credenciados.
                  </span>
                </div>
              )}
            </div>

            {/* Public Summary */}
            <div className="space-y-3 bg-card p-6 border border-border rounded-[1px]">
              <h2 className="font-serif text-lg font-bold text-foreground">
                Sobre o <em>Imóvel</em>
              </h2>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {property.public_summary ||
                  'Excelente oportunidade em condomínio de prestígio com infraestrutura completa e segurança 24h.'}
              </p>

              {property.listing_link && (
                <div className="pt-3 border-t border-border">
                  <a
                    href={property.listing_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-gold-deep hover:underline font-heading font-medium"
                  >
                    Ver anúncio completo no portal Godoy Prime
                    <ExternalLink className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
              <ShieldCheck className="w-4 h-4 text-gold-deep shrink-0" strokeWidth={1.5} />
              <span>
                Por questões de privacidade e segurança dos proprietários, o número exato da unidade
                é disponibilizado apenas mediante agendamento de visita com corretor credenciado.
              </span>
            </div>
          </div>

          {/* Right 1 Col: Formulário Tenho Interesse */}
          <div className="space-y-6">
            <Card className="bg-card border-border rounded-[1px] sticky top-24 shadow-luxury">
              <CardHeader>
                <CardTitle className="font-serif text-xl font-bold text-foreground">
                  Tenho <em>Interesse</em>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs font-sans">
                  Preencha o formulário para receber a ficha técnica completa e agendar uma visita
                  guiada com corretor habilitado no CRECI-RJ.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="py-6 text-center space-y-3 font-sans">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto" strokeWidth={1.5} />
                    <h3 className="font-serif text-lg text-foreground font-bold">
                      Obrigado pelo contato!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Recebemos seu interesse no <strong>{condoName}</strong>. Nossa equipe de
                      corretores credenciados entrará em contato nas próximas horas.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label className="text-foreground font-heading font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                        Seu Nome Completo:
                      </label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo Silveira"
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-heading font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                        WhatsApp / Telefone:
                      </label>
                      <Input
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="(21) 99999-9999"
                        className="text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-heading font-medium flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                        E-mail para Contato:
                      </label>
                      <Input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-foreground font-heading font-medium">
                        Melhor horário ou dúvidas (opcional):
                      </label>
                      <Textarea
                        value={buyerNotes}
                        onChange={(e) => setBuyerNotes(e.target.value)}
                        placeholder="Ex: Gostaria de agendar visita para sábado pela manhã..."
                        className="text-xs min-h-[80px]"
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full text-xs py-5">
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                          Solicitar Atendimento
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Ao enviar, seus dados são protegidos conforme a LGPD e compartilhados apenas
                      com corretores credenciados Godoy Prime.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
