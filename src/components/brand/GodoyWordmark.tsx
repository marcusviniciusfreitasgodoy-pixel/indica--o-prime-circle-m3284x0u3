import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GodoyWordmarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onDark?: boolean
  className?: string
}

export function GodoyWordmark({
  onDark = false,
  className,
  alt = 'Godoy Prime Realty',
  ...props
}: GodoyWordmarkProps) {
  const [hasError, setHasError] = React.useState(false)
  const src = onDark
    ? '/brand/godoy/logotipo-negativo-01.png'
    : '/brand/godoy/logotipo-principal.png'

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
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('inline-block object-contain', className)}
      {...props}
    />
  )
}
