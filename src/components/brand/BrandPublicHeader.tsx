import React from 'react'
import { Link } from 'react-router-dom'
import { GodoyWordmark } from './GodoyWordmark'
import { cn } from '@/lib/utils'

interface BrandPublicHeaderProps {
  className?: string
  showLoginLink?: boolean
  homeHref?: string
}

export function BrandPublicHeader({
  className,
  showLoginLink = true,
  homeHref = '/entrar',
}: BrandPublicHeaderProps) {
  return (
    <header
      className={cn(
        'navy w-full border-b border-border/20 px-4 py-3 sm:px-6 transition-colors',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link
          to={homeHref}
          className="flex items-center gap-2.5 focus:outline-none focus:ring-1 focus:ring-gold/40"
          aria-label="Godoy Prime Indica"
        >
          <GodoyWordmark onDark className="h-6 w-auto" />
          <span className="font-heading text-xs sm:text-sm font-semibold tracking-widest text-primary uppercase border-l border-primary/30 pl-2.5">
            INDICA
          </span>
        </Link>

        {showLoginLink && (
          <div className="flex items-center gap-2">
            <Link
              to="/entrar"
              className="font-heading text-xs text-primary/80 hover:text-gold transition-colors font-medium"
            >
              Área do Indicador
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
