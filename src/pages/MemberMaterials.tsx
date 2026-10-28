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
  FileText,
  MessageSquare,
} from 'lucide-react'

export const MemberMaterialsPage: React.FC = () => {
  const { user } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedFlyer, setCopiedFlyer] = useState(false)
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isLoadingQr, setIsLoadingQr] = useState(true)

  const origin = window.location.origin
  const publicSlug = user?.public_slug || user?.id || ''
  const personalLink = `${origin}/indicacao/${publicSlug}`

  useEffect(() => {
    let isMounted = true
    const loadQrCode = async () => {
      setIsLoadingQr(true)
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(personalLink)}`
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

    if (personalLink) {
      loadQrCode()
    }
    return () => {
      isMounted = false
    }
  }, [personalLink])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyWhatsapp = () => {
    const text = `Olá! Indique imóveis para venda ou locação na Barra da Tijuca e Recreio pela Godoy Prime Indica. Acompanhe todo o processo com transparência e receba sua recompensa no fechamento!\n\nAcesse meu link exclusivo:\n${personalLink}`
    navigator.clipboard.writeText(text)
    setCopiedWhatsapp(true)
    setTimeout(() => setCopiedWhatsapp(false), 2000)
  }

  const handleCopyFlyer = () => {
    const text = `Programa de Parceria Imobiliária — Godoy Prime Indica\n\nVocê sabia que pode monetizar seus contatos indicando imóveis para venda ou locação na Barra da Tijuca e Recreio?\n\nAcesse o link ou aponte a câmera para o QR Code para cadastrar proprietários ou compradores interessados com total discrição e acompanhamento transparente.\n\nLink exclusivo do indicador: ${personalLink}`
    navigator.clipboard.writeText(text)
    setCopiedFlyer(true)
    setTimeout(() => setCopiedFlyer(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Materiais de Divulgação
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Godoy Prime Indica</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Seu Kit de Divulgação & QR Code
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Compartilhe seu link pessoal e QR Code com síndicos, porteiros, clientes e parceiros
              para que todas as indicações fiquem vinculadas a você.
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

        <Card className="bg-slate-900/90 border-slate-800 shadow-lg overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-lg font-serif text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-500" />
              Seu QR Code Pessoal Oficial
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Gerado pelo backend para direcionar diretamente para a sua página de indicação.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-xl shadow-md shrink-0 flex items-center justify-center">
                {isLoadingQr ? (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                    Carregando QR...
                  </div>
                ) : (
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code de ${user?.name || 'Indicador'}`}
                    className="w-48 h-48 object-contain"
                  />
                )}
              </div>

              <div className="space-y-4 flex-1 w-full">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Seu Link Pessoal de Indicador
                  </label>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-400 break-all select-all flex items-center justify-between gap-2">
                    <span>{personalLink}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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
                      download={`qrcode-${publicSlug}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-9"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Baixar Imagem do QR Code
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
                      Testar Link Pessoal
                    </Button>
                  </a>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Imprima em cartões, folhetos ou envie via WhatsApp. Ao apontar a câmera do celular
                  para o QR Code, qualquer pessoa abrirá o formulário seguro com a sua identificação
                  automática.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  Mensagem para WhatsApp
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Texto pronto para enviar a amigos, porteiros ou contatos
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyWhatsapp}
                className="border-slate-700 text-xs h-7"
              >
                {copiedWhatsapp ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-sans space-y-2 leading-relaxed">
                <p>
                  Olá! Indique imóveis para venda ou locação na Barra da Tijuca e Recreio pela Godoy
                  Prime Indica. Acompanhe todo o processo com transparência e receba sua recompensa
                  no fechamento!
                </p>
                <p className="text-amber-400 font-mono text-[11px] break-all">
                  Acesse meu link exclusivo: {personalLink}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Modelo para Flyer ou Cartaz
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Para murais de condomínio ou impressão
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyFlyer}
                className="border-slate-700 text-xs h-7"
              >
                {copiedFlyer ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-sans space-y-2 leading-relaxed">
                <p className="font-semibold text-white">
                  🏢 Programa de Parceria Imobiliária — Godoy Prime Indica
                </p>
                <p>
                  Você sabia que pode monetizar seus contatos indicando imóveis para venda ou
                  locação na Barra da Tijuca e Recreio?
                </p>
                <p>
                  Acesse o link ou aponte a câmera para o QR Code para cadastrar proprietários ou
                  compradores interessados com total discrição e acompanhamento transparente.
                </p>
                <p className="text-amber-400 font-mono text-[11px] break-all">🔗 {personalLink}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default MemberMaterialsPage
