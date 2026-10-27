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
  Sparkles,
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
        description: 'Um consultor da Godoy Prime entrará em contato em breve.',
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
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-stone-400">Carregando imóvel da vitrine...</span>
      </div>
    )
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <Building className="w-12 h-12 text-stone-600 mb-4" />
        <h1 className="font-serif text-2xl text-white font-medium">Imóvel não encontrado</h1>
        <p className="text-stone-400 text-sm mt-2 max-w-md">
          Este imóvel pode ter sido negociado, retirado ou o link informado está incorreto.
        </p>
      </div>
    )
  }

  const condoName = property.condo_name || 'Condomínio de Alto Padrão'
  const neighborhood = property.neighborhood || 'Barra da Tijuca / Recreio'
  const photos = property.public_photos || []

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Brand Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 py-4 px-6 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif text-lg text-white font-semibold tracking-wide block">
                Godoy Prime
              </span>
              <span className="text-[10px] text-amber-400 uppercase tracking-widest block">
                Imóveis Exclusivos
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-300 rounded-none text-xs"
          >
            Parceria Oficial • Código #{codigo}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Imóvel Resumo e Fotos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 rounded-none text-xs">
                  Disponível para Visitas
                </Badge>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {neighborhood}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal leading-tight">
                {condoName}
              </h1>
              <p className="text-sm text-stone-400">
                Região nobre da {neighborhood}, Rio de Janeiro - RJ
              </p>
            </div>

            {/* Photos carousel or fallback image */}
            <div className="aspect-video bg-stone-900 border border-stone-800 overflow-hidden relative">
              {photos.length > 0 ? (
                <img src={photos[0]} alt={condoName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900/80 p-6 text-center space-y-2">
                  <Building className="w-12 h-12 text-stone-700" />
                  <span className="text-sm text-stone-400 font-serif">
                    Imóvel de Alto Padrão em {condoName}
                  </span>
                  <span className="text-xs text-stone-600 max-w-sm">
                    Fotos e tour privativo sob consulta com nossos especialistas.
                  </span>
                </div>
              )}
            </div>

            {/* Public Summary */}
            <div className="space-y-3 bg-stone-900/60 p-6 border border-stone-800 rounded-none">
              <h2 className="font-serif text-lg text-amber-200">Sobre o Imóvel</h2>
              <p className="text-stone-300 text-sm whitespace-pre-wrap leading-relaxed">
                {property.public_summary ||
                  'Excelente oportunidade em condomínio de prestígio com infraestrutura completa e segurança 24h.'}
              </p>

              {property.listing_link && (
                <div className="pt-3 border-t border-stone-800/80">
                  <a
                    href={property.listing_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    Ver anúncio completo no portal Godoy Prime
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                Por questões de privacidade e segurança dos proprietários, o número exato da unidade
                é disponibilizado apenas mediante agendamento de visita.
              </span>
            </div>
          </div>

          {/* Right 1 Col: Formulário Tenho Interesse */}
          <div className="space-y-6">
            <Card className="bg-stone-900 border-amber-500/30 rounded-none sticky top-24">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-white">Tenho Interesse</CardTitle>
                <CardDescription className="text-stone-400 text-xs">
                  Preencha o formulário para receber a ficha técnica completa e agendar uma visita
                  guiada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="py-6 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="font-serif text-lg text-white font-medium">
                      Obrigado pelo contato!
                    </h3>
                    <p className="text-xs text-stone-300">
                      Recebemos seu interesse no <strong>{condoName}</strong>. Nossa equipe entrará
                      em contato nas próximas horas.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-stone-300 font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        Seu Nome Completo:
                      </label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo Silveira"
                        className="bg-stone-950 border-stone-800 text-xs rounded-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-stone-300 font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-500" />
                        WhatsApp / Telefone:
                      </label>
                      <Input
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="(21) 99999-9999"
                        className="bg-stone-950 border-stone-800 text-xs rounded-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-stone-300 font-medium flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-stone-500" />
                        E-mail para Contato:
                      </label>
                      <Input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="bg-stone-950 border-stone-800 text-xs rounded-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-stone-300 font-medium">
                        Melhor horário ou dúvidas (opcional):
                      </label>
                      <Textarea
                        value={buyerNotes}
                        onChange={(e) => setBuyerNotes(e.target.value)}
                        placeholder="Ex: Gostaria de agendar visita para sábado pela manhã..."
                        className="bg-stone-950 border-stone-800 text-xs rounded-none h-20"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs py-5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Solicitar Atendimento
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-stone-500 text-center">
                      Ao enviar, seus dados são protegidos conforme a LGPD e compartilhados apenas
                      com a equipe Godoy Prime.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-6 text-center text-xs text-stone-600">
        © {new Date().getFullYear()} Godoy Prime Negócios Imobiliários • Barra da Tijuca & Recreio
      </footer>
    </div>
  )
}
