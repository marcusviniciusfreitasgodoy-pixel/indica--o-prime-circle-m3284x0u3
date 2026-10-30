import React from 'react'
import { ReferralStatus, ReferralType } from '@/types/referral'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, UserCheck, ArrowRightLeft, Sparkles, Home, Users } from 'lucide-react'

export const StatusBadge: React.FC<{ status: ReferralStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'nova':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Nova
        </Badge>
      )
    case 'em_atendimento':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Em Atendimento
        </Badge>
      )
    case 'atendida':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <UserCheck className="h-3 w-3" strokeWidth={1.5} />
          Atendida
        </Badge>
      )
    case 'concluida':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Concluída
        </Badge>
      )
    case 'repassada':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <ArrowRightLeft className="h-3 w-3" strokeWidth={1.5} />
          Repassada
        </Badge>
      )
    case 'recebida':
      return (
        <Badge variant="outline" className={`gap-1 font-medium ${className}`}>
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Recebida
        </Badge>
      )
    case 'em_triagem':
    case 'aceita':
      return (
        <Badge variant="outline" className={`gap-1 font-medium ${className}`}>
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Em Análise
        </Badge>
      )
    case 'em_contato':
    case 'qualificada':
    case 'em_negociacao':
    case 'captacao_solicitada':
      return (
        <Badge variant="warning" className={`gap-1 font-medium ${className}`}>
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Em Contato
        </Badge>
      )
    case 'captada':
      return (
        <Badge variant="success" className={`gap-1 font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Autorização assinada
        </Badge>
      )
    case 'em_divulgacao':
      return (
        <Badge variant="success" className={`gap-1 font-medium ${className}`}>
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Em Divulgação
        </Badge>
      )
    case 'vendida':
    case 'comprou':
      return (
        <Badge variant="success" className={`gap-1 font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Vendido / Comprou
        </Badge>
      )
    case 'alugada':
    case 'alugou':
      return (
        <Badge variant="success" className={`gap-1 font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
          Alugado
        </Badge>
      )
    case 'declinada_pela_godoy':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Reconhecida
        </Badge>
      )
    case 'recusada':
    case 'duplicada':
    case 'perdida':
    case 'retirada':
    case 'cancelada':
      return (
        <Badge variant="destructive" className={`gap-1 font-medium ${className}`}>
          Não Aproveitada
        </Badge>
      )
    case 'visitando':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Visitando Imóveis
        </Badge>
      )
    case 'proposta':
      return (
        <Badge variant="info" className={`gap-1 font-medium ${className}`}>
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Proposta
        </Badge>
      )
    default:
      return (
        <Badge variant="info" className={`font-medium ${className}`}>
          {status}
        </Badge>
      )
  }
}

export const TypeBadge: React.FC<{ type: ReferralType; className?: string }> = ({
  type,
  className = '',
}) => {
  if (type === 'imovel') {
    return (
      <Badge variant="secondary" className={`gap-1 font-normal ${className}`}>
        <Home className="h-3 w-3" strokeWidth={1.5} />
        Imóvel
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={`gap-1 font-normal ${className}`}>
      <Users className="h-3 w-3" strokeWidth={1.5} />
      Cliente
    </Badge>
  )
}
