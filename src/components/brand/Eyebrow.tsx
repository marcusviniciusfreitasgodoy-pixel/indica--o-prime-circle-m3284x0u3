import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function Eyebrow({ children, className, as: Component = 'span', ...props }: EyebrowProps) {
  return (
    <Component
      className={cn(
        'font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep [.navy_&]:text-gold-brand',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
