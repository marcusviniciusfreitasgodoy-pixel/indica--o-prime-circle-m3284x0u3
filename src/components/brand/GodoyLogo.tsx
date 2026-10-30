import * as React from 'react'
import { cn } from '@/lib/utils'

export type GodoyLogoVariant = 'principal' | 'negativo' | 'simbolo' | 'avatar'

export interface GodoyLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: GodoyLogoVariant
  className?: string
}

const LOGO_PATHS: Record<GodoyLogoVariant, string> = {
  principal: '/brand/godoy/logo-principal.png',
  negativo: '/brand/godoy/logo-negativo-01.png',
  simbolo: '/brand/godoy/simbolo-gold.png',
  avatar: '/brand/godoy/godoy-logo.png',
}

export function GodoyLogo({
  variant = 'principal',
  className,
  alt = 'Godoy Prime Realty',
  ...props
}: GodoyLogoProps) {
  const [hasError, setHasError] = React.useState(false)
  const src = LOGO_PATHS[variant] || LOGO_PATHS.principal

  if (hasError) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-heading font-semibold uppercase tracking-nav text-xs text-foreground',
          className,
        )}
      >
        GODOY PRIME REALTY
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('inline-block object-contain', className)}
      {...props}
    />
  )
}
