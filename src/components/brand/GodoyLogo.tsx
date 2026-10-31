import * as React from 'react'
import { cn } from '@/lib/utils'

export type GodoyLogoVariant =
  | 'principal'
  | 'negativo'
  | 'negativo-puro'
  | 'negativo-dourado'
  | 'simbolo'
  | 'avatar'
  | 'azul'
  | 'preto'
  | 'oficial'

export interface GodoyLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: GodoyLogoVariant
  className?: string
}

const LOGO_PATHS: Record<GodoyLogoVariant, string> = {
  principal: '/brand/godoy/logo-principal.png',
  // Variante padrão negativa nos fundos navy: arte branca com detalhe dourado
  negativo: '/brand/godoy/logotipo-negativo-01.png',
  'negativo-dourado': '/brand/godoy/logotipo-negativo-01.png',
  // Branca pura preservada para fallback ou uso explícito
  'negativo-puro': '/brand/godoy/logo-negativo-01.png',
  simbolo: '/brand/godoy/simbolo-gold.png',
  avatar: '/brand/godoy/godoy-logo.png',
  azul: '/brand/godoy/logo-azul.png',
  preto: '/brand/godoy/logo-preto.png',
  oficial: '/brand/godoy/logotipo-principal-oficial.png',
}

export function GodoyLogo({
  variant = 'principal',
  className,
  alt = 'Godoy Prime Realty',
  ...props
}: GodoyLogoProps) {
  const [hasError, setHasError] = React.useState(false)
  const [currentSrc, setCurrentSrc] = React.useState<string>(
    LOGO_PATHS[variant] || LOGO_PATHS.principal,
  )

  React.useEffect(() => {
    setCurrentSrc(LOGO_PATHS[variant] || LOGO_PATHS.principal)
    setHasError(false)
  }, [variant])

  const handleError = () => {
    // Se a variante solicitada for azul, preto ou oficial e ainda não existir o arquivo correspondente,
    // faz fallback gracioso para os logos oficiais existentes sem cair no texto.
    if (variant === 'azul' || variant === 'preto' || variant === 'oficial') {
      if (currentSrc !== '/brand/godoy/logotipo-principal.png') {
        setCurrentSrc('/brand/godoy/logotipo-principal.png')
        return
      }
    }
    // Fallback para negativo se falhar a versão com dourado:
    if (variant === 'negativo' || variant === 'negativo-dourado') {
      if (currentSrc !== '/brand/godoy/logo-negativo-01.png') {
        setCurrentSrc('/brand/godoy/logo-negativo-01.png')
        return
      }
    }
    setHasError(true)
  }

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
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={cn('inline-block object-contain', className)}
      {...props}
    />
  )
}
