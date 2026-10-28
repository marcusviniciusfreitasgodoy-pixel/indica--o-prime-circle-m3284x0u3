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
import { CheckCircle2, ShieldCheck, ArrowRight, MessageSquare, PhoneCall } from 'lucide-react'

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 shadow-2xl text-center">
          <CardHeader className="pb-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-white">
              Solicitação Recebida!
            </CardTitle>
            <CardDescription className="text-neutral-300 text-sm">
              Sua mensagem foi entregue com prioridade à nossa equipe de atendimento na Barra da
              Tijuca.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-1">
              <p className="text-xs text-neutral-400 uppercase tracking-wider font-mono">
                Protocolo de Atendimento
              </p>
              <p className="text-2xl font-mono font-bold text-amber-400">{protocolo}</p>
              {codigo && (
                <p className="text-[11px] text-neutral-500 font-mono">
                  Referência do Indicador: {codigo}
                </p>
              )}
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800 text-xs text-neutral-400 text-left space-y-2">
              <div className="flex items-center gap-2 text-neutral-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Próximos Passos
              </div>
              <p>1. Nossa equipe comercial fará a triagem das informações enviadas.</p>
              <p>
                2. Um consultor sênior entrará em contato via WhatsApp ou telefone para agendar a
                visita ou apresentar as opções ideais.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2">
            <a
              href={`https://wa.me/5521999999999?text=${encodeURIComponent(`Olá! Enviei uma solicitação pelo link de indicação (Protocolo: ${protocolo}). Gostaria de agilizar meu atendimento.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Falar com a Godoy Prime no WhatsApp
            </a>

            {codigo && (
              <Button
                asChild
                variant="outline"
                className="w-full border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs"
              >
                <Link to={`/i/${codigo}`}>Voltar para a página do indicador</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
