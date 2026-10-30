import { useSearchParams, useParams, Link } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ShieldCheck, MessageSquare } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

export default function IndicatorThankYouPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const [searchParams] = useSearchParams()
  const protocoloRaw = searchParams.get('protocolo') || ''
  const protocolo = protocoloRaw
    ? protocoloRaw.startsWith('#')
      ? protocoloRaw
      : `#${protocoloRaw}`
    : '#RECEBIDO'

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex flex-1 items-center justify-center p-4 py-12">
        <div className="max-w-md w-full space-y-4">
          <Card className="bg-card border border-border text-card-foreground shadow-luxury text-center rounded-[1px]">
            <CardHeader className="pb-3">
              <Eyebrow className="justify-center">PROTOCOLO REGISTRADO</Eyebrow>
              <div className="w-14 h-14 bg-success/15 text-success rounded-[1px] flex items-center justify-center mx-auto my-2 border border-success/30">
                <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <CardTitle className="text-2xl font-serif font-bold text-foreground">
                Solicitação <em>Recebida</em>!
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm font-sans">
                Sua indicação foi entregue com prioridade à nossa equipe de atendimento na Barra da
                Tijuca e Recreio dos Bandeirantes.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-4 rounded-[1px] bg-secondary/60 border border-gold-deep/30 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">
                  Protocolo de Atendimento
                </p>
                <p className="text-2xl font-mono font-bold text-gold-deep">{protocolo}</p>
                {codigo && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Referência do Indicador: #{codigo}
                  </p>
                )}
              </div>

              <div className="p-3 bg-secondary/40 rounded-[1px] border border-border text-xs text-muted-foreground text-left space-y-2 font-sans">
                <div className="flex items-center gap-2 text-foreground font-heading font-medium">
                  <ShieldCheck className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                  Próximos Passos
                </div>
                <p>1. Nossa equipe realizará a conferência e triagem da oportunidade.</p>
                <p>
                  2. Um corretor credenciado com CRECI ativo entrará em contato via WhatsApp ou
                  telefone para agendar a visita ou apresentar as opções adequadas.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/5521999999999?text=${encodeURIComponent(`Olá! Enviei uma solicitação pelo link de indicação (Protocolo: ${protocolo}). Gostaria de agilizar meu atendimento.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[1px] bg-primary text-primary-foreground font-heading font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-gold-light"
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                Falar com a Godoy Prime no WhatsApp
              </a>

              {codigo && (
                <Button asChild variant="outline" className="w-full text-xs">
                  <Link to={`/i/${codigo}`}>Voltar para a página do indicador</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
