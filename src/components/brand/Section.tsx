import * as React from 'react'
import { cn } from '@/lib/utils'

export type SectionTone = 'white' | 'cream' | 'navy'

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SectionTone
  children?: React.ReactNode
  containerClassName?: string
}

export function Section({
  tone = 'white',
  children,
  className,
  containerClassName,
  ...props
}: SectionProps) {
  const toneClasses: Record<SectionTone, string> = {
    white: 'bg-background text-foreground',
    cream: 'bg-card text-card-foreground',
    navy: 'navy bg-navy text-on-navy',
  }

  return (
    <section className={cn('w-full py-12 md:py-16', toneClasses[tone], className)} {...props}>
      <div
        className={cn(
          'mx-auto w-full max-w-[1120px] px-[clamp(16px,5vw,60px)]',
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}
