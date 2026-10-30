import React, { useState, useEffect } from 'react'
import { MemberNavbar } from '@/components/MemberNavbar'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  QrCode,
  Copy,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Share2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Eyebrow } from '@/components/brand'

interface ReadyMessage {
  id: string
  title: string
  targetAudience: string
  text: string
}

export const MemberMaterialsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [participantCode, setParticipantCode] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoadingQr, setIsLoadingQr] = useState(true)

  const origin = window.location.origin

  useEffect(() => {
    let isMounted = true
    const loadParticipant = async () => {
      if (!user) return
      try {
        const partRec = await pb
          .collection('participants')
          .getFirstListItem(`user_id = '${user.id}'`)
        if (isMounted && partRec) {
          setParticipantCode(partRec.referral_code || '')
        }
      } catch {
        // Sem registro de participante
      }
    }
    loadParticipant()
    return () => {
      isMounted = false
    }
  }, [user])

  // Link oficial do programa /i/:codigo (ou slug/id como fallback)
  const codeOrSlug = participantCode || user?.public_slug || user?.id || ''
  const personalLink = `${origin}/i/${codeOrSlug}`

  useEffect(() => {
    let isMounted = true
    const loadQrCode = async () => {
      if (!codeOrSlug) return
      setIsLoadingQr(true)
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        personalLink,
      )}`
      try {
        const res = await fetch(
          `${pb.baseUrl}/backend/v1/communication/qr-code?url=${encodeURIComponent(personalLink)}`,
        )
        const data = await res.json()
        if (isMounted) {
          if (data?.url) {
            setQrCodeUrl(data.url)
          } else {
            setQrCodeUrl(fallbackUrl)
          }
        }
      } catch {
        if (isMounted) {
          setQrCodeUrl(fallbackUrl)
        }
      } finally {
        if (isMounted) {
          setIsLoadingQr(false)
        }
      }
    }

    loadQrCode()
    return () => {
      isMounted = false
    }
  }, [codeOrSlug, personalLink])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalLink)
    setCopiedLink(true)
    toast({
      title: 'Link copiado!',
      description: 'Envie para proprietários ou compradores interessados na Barra e Recreio.',
    })
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyMessage = (msg: ReadyMessage) => {
    navigator.clipboard.writeText(msg.text)
    setCopiedMsgId(msg.id)
    toast({
      title: 'Mensagem copiada!',
      description: 'Cole no WhatsApp para envio individual.',
    })
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  const handleOpenWhatsApp = (text: string) => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  // Mensagens prontas para envio individual em conformidade estrita com o regulamento
  const readyMessages: ReadyMessage[] = [
    {
      id: 'geral',
      title: 'Mensagem Geral — Venda, Locação ou Compra',
      targetAudience: 'Para enviar individualmente a amigos ou contatos diretos',
      text: `Conhece alguém que quer vender, alugar ou comprar imóvel na Barra da Tijuca ou no Recreio? Me passa o contato pelo meu link: ${personalLink}. A Godoy Prime Realty, com corretores com CRECI ativo, atende, você recebe uma recompensa por indicação se a indicação valer.`,
    },
    {
      id: 'proprietario',
      title: 'Mensagem para Proprietário que Quer Vender ou Alugar',
      targetAudience: 'Para proprietário de apartamento ou casa na Barra/Recreio',
      text: `Olá! Se estiver pensando em colocar seu imóvel para vender ou alugar na Barra da Tijuca ou Recreio, cadastre pelo meu link: ${personalLink}. Corretores com CRECI ativo da Godoy Prime Realty cuidam de toda a visita, opinião de valor e contrato, com total discrição e segurança.`,
    },
    {
      id: 'comprador',
      title: 'Mensagem para Quem Procura Imóvel',
      targetAudience: 'Para quem busca imóvel para compra na região',
      text: `Olá! Sabendo que você procura imóvel na Barra da Tijuca ou Recreio, recomendo falar com a Godoy Prime Realty pelo meu link: ${personalLink}. Corretores com CRECI ativo apresentam opções selecionadas com atendimento personalizado.`,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 max-w-4xl">
        {/* Banner do topo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[1px] bg-card border border-border shadow-luxury">
          <div className="space-y-1.5">
            <Eyebrow>MATERIAIS PESSOAIS · ENTREGA EM MÃOS</Eyebrow>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Cartão Pessoal &amp; <em>Mensagens Prontas</em>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed font-sans">
              O programa é estritamente confidencial e pessoal. Não há cartazes para afixação em
              áreas comuns. Utilize seu cartão pessoal com QR para entregar em mãos ou envie as
              mensagens prontas individualmente por WhatsApp.
            </p>
          </div>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="text-xs shrink-0 self-start sm:self-auto rounded-[1px] h-9"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-success" strokeWidth={1.5} />
                Link Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5 text-gold-deep" strokeWidth={1.5} />
                Copiar Meu Link
              </>
            )}
          </Button>
        </div>

        {/* Regras e Diretrizes do Regulamento */}
        <div className="p-4 bg-secondary/50 border border-border rounded-[1px] space-y-2 text-xs text-foreground font-sans">
          <div className="flex items-center gap-2 text-gold-deep font-heading font-semibold text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            Diretrizes do Regulamento (Seções 3 e 4)
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
            <li>
              <strong className="text-foreground">Sem divulgação em massa:</strong> é vedada a
              afixação de cartazes, panfletagem ou divulgação pública em murais de condomínio ou
              grupos abertos.
            </li>
            <li>
              <strong className="text-foreground">Atendimento privativo de corretor:</strong> toda
              visita, avaliação, negociação e contrato são feitos exclusivamente por corretor de
              imóveis credenciado com CRECI ativo.
            </li>
            <li>
              <strong className="text-foreground">Papel do indicador:</strong> o indicador comunica
              a oportunidade e recebe a recompensa por indicação prevista, não negocia, não fala de
              preço e não acompanha visita.
            </li>
          </ul>
        </div>

        {/* Cartão Pessoal e QR Code do /i/:codigo */}
        <Card className="bg-card border-border shadow-sm overflow-hidden rounded-[1px]">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base sm:text-lg font-serif font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
              Cartão Pessoal do Indicador com QR Code
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-sans">
              Ideal para entregar em mãos ou mostrar no celular para quem deseja indicar imóvel ou
              comprar na Barra da Tijuca e Recreio.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 font-sans">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Moldura de Cartão Pessoal Imprimível */}
              <div className="navy w-full max-w-xs sm:max-w-sm rounded-[1px] border border-border/30 p-5 shadow-luxury space-y-4 shrink-0 text-center">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-[10px] font-heading font-semibold uppercase tracking-widest text-primary">
                    GODOY PRIME REALTY
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    #{codeOrSlug || 'INDICADOR'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-[1px] shadow-sm inline-block">
                  {isLoadingQr ? (
                    <div className="w-36 h-36 flex items-center justify-center text-muted-foreground text-xs font-mono">
                      Gerando QR...
                    </div>
                  ) : (
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code de ${user?.name || 'Indicador'}`}
                      className="w-36 h-36 object-contain"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-heading font-bold text-foreground tracking-wide">
                    {user?.name || 'Indicador Autorizado'}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight font-sans">
                    Aponte a câmera para registrar sua indicação direta com segurança e discrição.
                  </p>
                </div>

                <div className="pt-1 border-t border-border/20 text-[9px] text-muted-foreground font-mono">
                  CRECI-RJ PJ 11.841 · Atendimento por corretores credenciados
                </div>
              </div>

              {/* Controles do Cartão */}
              <div className="space-y-4 flex-1 w-full">
                <div>
                  <label className="text-xs font-heading font-semibold text-foreground uppercase tracking-wider block mb-1">
                    Seu Link Pessoal Oficial (/i/{codeOrSlug})
                  </label>
                  <div className="bg-secondary/60 p-3 rounded-[1px] border border-border font-mono text-xs text-foreground break-all select-all flex items-center justify-between gap-2">
                    <span>{personalLink}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={handleCopyLink} size="sm" className="text-xs h-9 rounded-[1px]">
                    {copiedLink ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                        Copiar Link
                      </>
                    )}
                  </Button>

                  {qrCodeUrl && (
                    <a
                      href={qrCodeUrl}
                      download={`cartao-qrcode-${codeOrSlug}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="text-xs h-9 rounded-[1px]">
                        <Download className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                        Baixar QR Code
                      </Button>
                    </a>
                  )}

                  <a href={personalLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-xs h-9 rounded-[1px]">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                      Abrir Meu Link
                    </Button>
                  </a>
                </div>

                <div className="p-3 bg-secondary/40 rounded-[1px] border border-border text-xs text-muted-foreground space-y-1 font-sans">
                  <p className="text-foreground font-heading font-medium">
                    Como utilizar na prática:
                  </p>
                  <p className="leading-relaxed">
                    Mostre o cartão no celular para a pessoa escanear, ou envie o link
                    individualmente. Ao abrir, ela preenche o formulário direto onde já autoriza o
                    contato da Godoy Prime Realty.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens Prontas para Envio Individual por WhatsApp */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
              Mensagens Prontas para <em>WhatsApp Individual</em>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">
              Envie de forma individual para contatos específicos. Nunca envie em listas de
              transmissão abertas ou grupos públicos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {readyMessages.map((msg) => {
              const isCopied = copiedMsgId === msg.id

              return (
                <Card
                  key={msg.id}
                  className="bg-card border-border text-card-foreground rounded-[1px] shadow-sm"
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 border-b border-border">
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-heading font-semibold text-foreground">
                        {msg.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground font-sans">
                        {msg.targetAudience}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyMessage(msg)}
                        className="text-xs h-8 rounded-[1px]"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2
                              className="h-3.5 w-3.5 mr-1 text-success"
                              strokeWidth={1.5}
                            />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                            Copiar
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenWhatsApp(msg.text)}
                        className="text-xs h-8 rounded-[1px]"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                        WhatsApp
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-3 font-sans">
                    <div className="p-3.5 bg-secondary/50 border border-border rounded-[1px] text-xs sm:text-sm text-foreground leading-relaxed">
                      {msg.text}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

export default MemberMaterialsPage
