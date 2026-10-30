import React, { useState, useEffect } from 'react'
import { MemberNavbar } from '@/components/MemberNavbar'
import { Card, CardContent } from '@/components/ui/card'
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
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Reward } from '@/services/rewards'
import { Link } from 'react-router-dom'
import { Eyebrow } from '@/components/brand'

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
  }, [user, toast])

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
          label: 'Aguardando Aprovação',
          color: 'bg-warning/15 text-warning border-warning/30',
        }
      case 'em_analise':
        return {
          label: 'Em Validação',
          color: 'bg-info/15 text-info border-info/30',
        }
      case 'em_revisao_admin':
        return {
          label: 'Em Verificação Interna',
          color: 'bg-secondary text-muted-foreground border-border',
        }
      case 'pendente_dados':
        return {
          label: 'Dados Pendentes (CPF/Pix)',
          color: 'bg-warning/15 text-warning border-warning/30',
        }
      case 'aprovada':
        return {
          label: 'Aprovada para Pagamento',
          color: 'bg-success/15 text-success border-success/30',
        }
      case 'em_lote':
        return {
          label: 'Programada no Lote Mensal',
          color: 'bg-info/15 text-info border-info/30',
        }
      case 'paga':
        return {
          label: 'Paga',
          color: 'bg-success text-success-foreground border-success',
        }
      case 'cancelada':
      default:
        return {
          label: 'Cancelada',
          color: 'bg-secondary text-muted-foreground border-border',
        }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 space-y-5 sm:space-y-6">
        <div>
          <Link
            to="/painel"
            className="inline-flex items-center text-xs font-heading font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 h-10 sm:h-8 min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1 text-gold-deep shrink-0" strokeWidth={1.5} />
            Voltar ao Painel
          </Link>
          <div className="p-4 sm:p-6 rounded-[1px] bg-card border border-border shadow-luxury space-y-1.5">
            <Eyebrow>EXTRATO · RECOMPENSA POR INDICAÇÃO</Eyebrow>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-foreground break-words">
              Minhas <em>Recompensas</em>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl font-sans">
              Acompanhe o valor de cada marco conquistado, datas previstas de pagamento e histórico
              de liquidações.
            </p>
          </div>
        </div>

        {/* Alerta de dados pendentes se CPF/Pix não cadastrados */}
        {hasMissingData && (
          <div className="bg-warning/10 border border-warning/30 p-4 rounded-[1px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="space-y-0.5">
                <div className="font-heading font-semibold text-foreground">
                  Atenção: complete seu perfil para liberar pagamentos
                </div>
                <div className="text-muted-foreground text-[11px] font-sans">
                  Recompensas monetárias exigem CPF e chave Pix válidos. Enquanto faltarem dados,
                  suas recompensas ficam retidas em status Pendente.
                </div>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="text-xs rounded-[1px] h-8 whitespace-nowrap shrink-0 border-warning/40 text-foreground hover:bg-warning/10"
            >
              <Link to="/perfil">
                Completar Perfil <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
              </Link>
            </Button>
          </div>
        )}

        {/* Cards Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border-border rounded-[1px] text-card-foreground shadow-sm overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-heading font-semibold text-gold-deep uppercase tracking-wider truncate">
                  Total a Receber
                </div>
                <div className="text-xl sm:text-3xl font-mono font-bold text-foreground mt-1 break-words">
                  R$ {aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                  Em validação ou programadas para lote mensal
                </div>
              </div>
              <div className="w-10 h-10 rounded-[1px] bg-secondary border border-border text-gold-deep flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-[1px] text-card-foreground shadow-sm overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-heading font-semibold text-success uppercase tracking-wider truncate">
                  Total Recebido
                </div>
                <div className="text-xl sm:text-3xl font-mono font-bold text-success mt-1 break-words">
                  R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                  Liquidadas com comprovante via Pix
                </div>
              </div>
              <div className="w-10 h-10 rounded-[1px] bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Recompensas */}
        <div className="space-y-3">
          <h2 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico Detalhado ({rewards.length})
          </h2>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-[1px]">
              Carregando recompensas...
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border text-muted-foreground text-xs bg-card rounded-[1px]">
              Você ainda não possui recompensas registradas. Compartilhe seu link pessoal ou
              registre uma nova indicação para começar.
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
                    className="bg-card border-border rounded-[1px] text-card-foreground hover:border-gold-deep transition-colors shadow-sm"
                  >
                    <CardContent className="p-4 space-y-3 text-xs font-sans">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`${stInfo.color} text-[10px] rounded-[1px] font-heading`}
                          >
                            {stInfo.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] rounded-[1px] font-heading uppercase"
                          >
                            Marco:{' '}
                            {r.milestone === 'captada'
                              ? 'Autorização / Imóvel Qualificado'
                              : 'Atendimento / Primeira Visita'}
                          </Badge>
                          {r.via_decline && (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] rounded-[1px] font-heading">
                              Reconhecimento Especial
                            </Badge>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="font-mono font-bold text-base text-foreground">
                            R${' '}
                            {Number(r.final_amount_brl || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-muted-foreground text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building
                            className="w-3.5 h-3.5 text-gold-deep shrink-0"
                            strokeWidth={1.5}
                          />
                          <span className="break-words">
                            {condoObj?.name || 'Condomínio não informado'} — Indicação #
                            <span className="font-mono">{r.referral_id?.substring(0, 8)}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-foreground font-medium font-mono shrink-0">
                          <Calendar
                            className="w-3.5 h-3.5 text-gold-deep shrink-0"
                            strokeWidth={1.5}
                          />
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
