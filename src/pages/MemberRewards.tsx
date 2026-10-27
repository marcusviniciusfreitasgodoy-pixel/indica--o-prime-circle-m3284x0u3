import React, { useState, useEffect } from 'react'
import { MemberNavbar } from '@/components/MemberNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  ArrowRight,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Reward } from '@/services/rewards'
import { Link } from 'react-router-dom'

export function MemberRewardsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [rewards, setRewards] = useState<Reward[]>([])
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reckoningDay, setReckoningDay] = useState(10)
  const [dueDay, setDueDay] = useState(25)

  useEffect(() => {
    const loadMemberData = async () => {
      if (!user) return
      try {
        setLoading(true)

        // 1. Busca perfil de participante do usuário
        let partRec: any = null
        try {
          partRec = await pb.collection('participants').getFirstListItem(`user_id = '${user.id}'`)
          setParticipant(partRec)
        } catch {
          /* intentionally ignored */
        }

        // 2. Busca program_settings para datas
        try {
          const stList = await pb.collection('program_settings').getFullList()
          stList.forEach((s: any) => {
            try {
              const val = JSON.parse(s.value_json)
              if (s.key === 'monthly_reckoning_day') setReckoningDay(Number(val))
              if (s.key === 'batch_payment_due_day') setDueDay(Number(val))
            } catch {
              /* intentionally ignored */
            }
          })
        } catch {
          /* intentionally ignored */
        }

        // 3. Busca recompensas do participante
        if (partRec) {
          const list = await pb.collection('rewards').getFullList<Reward>({
            filter: `participant_id = '${partRec.id}'`,
            sort: '-created',
            expand: 'referral_id,referral_id.condominium_id',
          })
          setRewards(list)
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar recompensas',
          description: err?.message || 'Falha ao buscar histórico.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadMemberData()
  }, [user])

  // Cálculos de totais
  const aReceber = rewards
    .filter((r) =>
      [
        'aguardando_comissao',
        'em_analise',
        'em_revisao_admin',
        'pendente_dados',
        'aprovada',
        'em_lote',
      ].includes(r.status),
    )
    .reduce((sum, r) => sum + (Number(r.final_amount_brl) || 0), 0)

  const recebido = rewards
    .filter((r) => r.status === 'paga')
    .reduce((sum, r) => sum + (Number(r.final_amount_brl) || 0), 0)

  const hasMissingData = participant && (!participant.cpf || !participant.pix_key)

  // Calcula data prevista de pagamento (dia de vencimento do mês seguinte ou atual)
  const getExpectedPaymentDate = (r: Reward) => {
    if (r.status === 'paga' && r.paid_at) {
      return `Pago em ${new Date(r.paid_at).toLocaleDateString('pt-BR')}`
    }
    const now = new Date()
    const targetMonth = now.getDate() <= reckoningDay ? now.getMonth() : now.getMonth() + 1
    const targetYear = targetMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
    const expDate = new Date(targetYear, targetMonth % 12, dueDay)
    return `Previsto: ${expDate.toLocaleDateString('pt-BR')}`
  }

  const getStatusLabel = (r: Reward) => {
    switch (r.status) {
      case 'aguardando_comissao':
        return {
          label: 'Aguardando Comissão',
          color: 'bg-amber-950 text-amber-300 border-amber-800',
        }
      case 'em_analise':
        return { label: 'Em Validação', color: 'bg-blue-950 text-blue-300 border-blue-800' }
      case 'em_revisao_admin':
        return {
          label: 'Em Verificação Interna',
          color: 'bg-stone-900 text-stone-300 border-stone-800',
        }
      case 'pendente_dados':
        return {
          label: 'Dados Pendentes (CPF/Pix)',
          color: 'bg-purple-950 text-purple-300 border-purple-800',
        }
      case 'aprovada':
        return {
          label: 'Aprovada para Pagamento',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        }
      case 'em_lote':
        return {
          label: 'Programada no Lote Mensal',
          color: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        }
      case 'paga':
        return { label: 'Paga', color: 'bg-emerald-900 text-white border-emerald-600' }
      case 'cancelada':
        return { label: 'Cancelada', color: 'bg-stone-900 text-stone-500 border-stone-800' }
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <MemberNavbar />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="border-b border-stone-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              Minhas Recompensas
            </h1>
          </div>
          <p className="text-xs text-stone-400">
            Acompanhe o valor de cada marco conquistado, datas previstas de pagamento e histórico de
            liquidações.
          </p>
        </div>

        {/* Alerta de dados pendentes se CPF/Pix não cadastrados */}
        {hasMissingData && (
          <div className="bg-purple-950/40 border border-purple-800/80 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-purple-200">
                  Atenção: Complete seu perfil para liberar pagamentos
                </div>
                <div className="text-purple-300/80 text-[11px] mt-0.5">
                  Recompensas monetárias exigem CPF e chave Pix válidos. Enquanto faltarem dados,
                  suas recompensas ficam retidas em status Pendente.
                </div>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-none h-8 whitespace-nowrap"
            >
              <Link to="/perfil">
                Completar Perfil <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* Cards Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-stone-900/60 border-stone-800 rounded-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Total a Receber
                </div>
                <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
                  R$ {aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Em validação ou programadas para lote
                </div>
              </div>
              <Clock className="w-8 h-8 text-amber-500/30" />
            </CardContent>
          </Card>

          <Card className="bg-stone-900/60 border-stone-800 rounded-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Total Recebido
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                  R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Liquidadas com comprovante emitido
                </div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
            </CardContent>
          </Card>
        </div>

        {/* Lista de Recompensas */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Histórico Detalhado ({rewards.length})
          </h2>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Carregando recompensas...</div>
          ) : rewards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
              Você ainda não possui recompensas registradas. Envie novas indicações para começar a
              pontuar!
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((r) => {
                const stInfo = getStatusLabel(r)
                const refObj = r.expand?.referral_id
                const condoObj = refObj?.expand?.condominium_id

                return (
                  <Card
                    key={r.id}
                    className="bg-stone-900/60 border-stone-800 rounded-none hover:border-stone-700 transition-colors"
                  >
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${stInfo.color} text-[10px] rounded-none`}>
                            {stInfo.label}
                          </Badge>
                          <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                            Marco:{' '}
                            {r.milestone === 'captada'
                              ? 'Formalização / Captação'
                              : 'Negócio Concluído'}
                          </Badge>
                          {r.via_decline && (
                            <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px] rounded-none">
                              Reconhecimento Especial
                            </Badge>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-base text-emerald-400">
                            R${' '}
                            {Number(r.final_amount_brl || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-stone-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {condoObj?.name || 'Condomínio não informado'} — Indicação #
                            {r.referral_id?.substring(0, 8)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>{getExpectedPaymentDate(r)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
export default MemberRewardsPage
