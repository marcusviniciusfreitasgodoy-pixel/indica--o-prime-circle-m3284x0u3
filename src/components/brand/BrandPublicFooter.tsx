import React from 'react'
import { GodoyLogo } from './GodoyLogo'
import { PoweredByPrimeCircle } from './PoweredByPrimeCircle'
import { cn } from '@/lib/utils'

interface BrandPublicFooterProps {
  className?: string
}

export function BrandPublicFooter({ className }: BrandPublicFooterProps) {
  return (
    <footer
      className={cn(
        'navy w-full border-t border-border/20 py-8 px-4 sm:px-6 transition-colors',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <GodoyLogo variant="avatar" className="h-8 w-8 shrink-0" />
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold tracking-wider text-primary">
              Godoy Prime Realty · CRECI-RJ PJ 11.841
            </span>
            <span className="font-sans text-[11px] text-muted-foreground">
              Programa de Indicações Godoy Prime · Barra da Tijuca e Recreio dos Bandeirantes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PoweredByPrimeCircle className="text-muted-foreground" />
        </div>
      </div>
    </footer>
  )
}
