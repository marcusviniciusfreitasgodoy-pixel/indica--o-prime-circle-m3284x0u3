import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PoweredByPrimeCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function PoweredByPrimeCircle({ className, ...props }: PoweredByPrimeCircleProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-on-navy-muted', className)} {...props}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Círculo esquerdo na cor dourado (gold-brand / gold-deep) */}
        <circle cx="36" cy="50" r="30" stroke="hsl(var(--gold-brand))" strokeWidth="3" />
        {/* Círculo direito na cor do texto atual */}
        <circle cx="64" cy="50" r="30" stroke="currentColor" strokeWidth="3" />
        {/* Ponto central com raio 3.5 */}
        <circle cx="50" cy="50" r="3.5" fill="currentColor" />
      </svg>
      <span className="font-heading text-[10px] font-semibold uppercase tracking-label">
        Tecnologia Prime Circle
      </span>
    </div>
  )
}
