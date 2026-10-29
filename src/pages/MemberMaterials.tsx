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
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Share2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
      text: `Conhece alguém que quer vender, alugar ou comprar imóvel na Barra da Tijuca ou no Recreio? Me passa o contato pelo meu link: ${personalLink}. A Godoy Prime Realty, com corretores com CRECI ativo, atende — você recebe uma recompensa por indicação se a indicação valer.`,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 max-w-4xl">
        {/* Banner do topo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Materiais Pessoais
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Entrega em mãos e WhatsApp individual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Cartão Pessoal & Mensagens Prontas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              O programa é estritamente confidencial e pessoal. Não há cartazes para afixação em
              áreas comuns. Utilize seu cartão pessoal com QR para entregar em mãos ou envie as
              mensagens prontas individualmente por WhatsApp.
            </p>
          </div>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs shrink-0 self-start sm:self-auto"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Link Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copiar Meu Link
              </>
            )}
          </Button>
        </div>

        {/* Regras e Diretrizes do Regulamento */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            Diretrizes do Regulamento (Seções 3 e 4)
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 leading-relaxed text-[11px] sm:text-xs">
            <li>
              <strong>Sem divulgação em massa:</strong> É vedada a afixação de cartazes, panfletagem
              ou divulgação pública em murais de condomínio ou grupos abertos.
            </li>
            <li>
              <strong>Atendimento privativo de corretor:</strong> Toda visita, avaliação, negociação
              e contrato são feitos exclusivamente por corretor de imóveis com CRECI ativo.
            </li>
            <li>
              <strong>Papel do indicador:</strong> O indicador comunica a oportunidade e recebe a
              recompensa por indicação prevista; não negocia, não fala de preço e não acompanha
              visita.
            </li>
          </ul>
        </div>

        {/* Cartão Pessoal e QR Code do /i/:codigo */}
        <Card className="bg-slate-900/90 border-slate-800 shadow-lg overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Cartão Pessoal do Indicador com QR Code
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Ideal para entregar em mãos ou mostrar no celular para quem deseja indicar imóvel ou
              comprar.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Moldura de Cartão Pessoal Imprimível */}
              <div className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-gradient-to-br from-slate-900 to-black border-2 border-amber-500/40 p-5 shadow-2xl space-y-4 shrink-0 text-center">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                    GODOY PRIME REALTY
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    #{codeOrSlug || 'INDICADOR'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl shadow-md inline-block">
                  {isLoadingQr ? (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
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
                  <div className="text-sm font-bold text-white tracking-wide">
                    {user?.name || 'Indicador Autorizado'}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Aponte a câmera para registrar sua indicação direta com segurança e discrição.
                  </p>
                </div>

                <div className="pt-1 border-t border-slate-800/80 text-[9px] text-slate-500">
                  Visita, avaliação e contrato realizados por corretores com CRECI ativo.
                </div>
              </div>

              {/* Controles do Cartão */}
              <div className="space-y-4 flex-1 w-full">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Seu Link Pessoal Oficial (/i/{codeOrSlug})
                  </label>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-400 break-all select-all flex items-center justify-between gap-2">
                    <span>{personalLink}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-950" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-9"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Baixar QR Code
                      </Button>
                    </a>
                  )}

                  <a href={personalLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white text-xs h-9"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Abrir Meu Link
                    </Button>
                  </a>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p className="text-slate-300 font-medium">Como utilizar na prática:</p>
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
            <h2 className="text-lg sm:text-xl font-bold font-serif text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              Mensagens Prontas para WhatsApp Individual
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Envie de forma individual para contatos específicos. Nunca envie em listas de
              transmissão abertas ou grupos públicos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {readyMessages.map((msg) => {
              const isCopied = copiedMsgId === msg.id

              return (
                <Card key={msg.id} className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 border-b border-slate-800/60">
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-semibold text-white">
                        {msg.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-400">
                        {msg.targetAudience}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyMessage(msg)}
                        className="border-slate-700 text-xs h-8"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsApp(msg.text)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1" />
                        Abrir WhatsApp
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-3">
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
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
