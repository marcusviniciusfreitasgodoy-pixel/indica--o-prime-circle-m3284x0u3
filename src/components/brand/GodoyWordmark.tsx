import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GodoyWordmarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onDark?: boolean
  className?: string
  variant?: 'auto' | 'principal' | 'negativo' | 'azul' | 'preto' | 'oficial'
}

export function GodoyWordmark({
  onDark = false,
  variant = 'auto',
  className,
  alt = 'Godoy Prime Realty',
  ...props
}: GodoyWordmarkProps) {
  const [hasError, setHasError] = React.useState(false)

  const resolveInitialSrc = () => {
    if (variant === 'azul') return '/brand/godoy/logo-azul.png'
    if (variant === 'preto') return '/brand/godoy/logo-preto.png'
    if (variant === 'oficial') return '/brand/godoy/logotipo-principal-oficial.png'
    if (variant === 'negativo') return '/brand/godoy/logotipo-negativo-01.png'
    if (variant === 'principal') return '/brand/godoy/logotipo-principal.png'
    return onDark ? '/brand/godoy/logotipo-negativo-01.png' : '/brand/godoy/logotipo-principal.png'
  }

  const [currentSrc, setCurrentSrc] = React.useState<string>(resolveInitialSrc())

  React.useEffect(() => {
    setCurrentSrc(resolveInitialSrc())
    setHasError(false)
  }, [onDark, variant])

  const handleError = () => {
    if (variant === 'azul' || variant === 'preto' || variant === 'oficial') {
      const fallback = onDark
        ? '/brand/godoy/logotipo-negativo-01.png'
        : '/brand/godoy/logotipo-principal.png'
      if (currentSrc !== fallback) {
        setCurrentSrc(fallback)
        return
      }
    }
    setHasError(true)
  }

  if (hasError) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-heading font-semibold uppercase tracking-nav text-xs',
          onDark ? 'text-on-navy' : 'text-foreground',
          className,
        )}
      >
        GODOY PRIME REALTY
      </span>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={cn('inline-block object-contain', className)}
      {...props}
    />
  )
}
