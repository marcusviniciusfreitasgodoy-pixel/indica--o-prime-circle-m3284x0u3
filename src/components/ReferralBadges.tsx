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
        <Badge
          variant="outline"
          className={`bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1 font-medium ${className}`}
        >
          <Sparkles className="h-3 w-3" />
          Nova
        </Badge>
      )
    case 'em_atendimento':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 font-medium ${className}`}
        >
          <Clock className="h-3 w-3" />
          Em Atendimento
        </Badge>
      )
    case 'atendida':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 font-medium ${className}`}
        >
          <UserCheck className="h-3 w-3" />
          Atendida
        </Badge>
      )
    case 'concluida':
      return (
        <Badge
          variant="outline"
          className={`bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1 font-medium ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          Concluída
        </Badge>
      )
    case 'repassada':
      return (
        <Badge
          variant="outline"
          className={`bg-orange-500/10 text-orange-400 border-orange-500/30 gap-1 font-medium ${className}`}
        >
          <ArrowRightLeft className="h-3 w-3" />
          Repassada
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className={`text-slate-400 border-slate-700 ${className}`}>
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
      <Badge
        variant="secondary"
        className={`bg-slate-800 text-slate-200 hover:bg-slate-800 border border-slate-700 gap-1 font-normal ${className}`}
      >
        <Home className="h-3 w-3 text-amber-400" />
        Imóvel
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={`bg-slate-800 text-slate-200 hover:bg-slate-800 border border-slate-700 gap-1 font-normal ${className}`}
    >
      <Users className="h-3 w-3 text-sky-400" />
      Cliente
    </Badge>
  )
}
