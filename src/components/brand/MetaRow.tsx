import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MetaRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  isMonoValue?: boolean
  className?: string
}

function shouldDefaultToMono(val: React.ReactNode): boolean {
  if (typeof val === 'number') return true
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (/^R\$/i.test(trimmed)) return true
    if (/CRECI/i.test(trimmed)) return true
    if (/^#?[0-9A-Z]{4,}(-[0-9A-Z]+)*$/i.test(trimmed)) return true
    if (/^\d+([.,]\d+)?%?$/.test(trimmed)) return true
  }
  return false
}

export function MetaRow({ label, value, isMonoValue, className, ...props }: MetaRowProps) {
  const useMono = isMonoValue ?? shouldDefaultToMono(value)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-border/40 text-sm last:border-b-0 min-w-0',
        className,
      )}
      {...props}
    >
      <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-muted-foreground shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'text-left sm:text-right text-foreground font-normal break-words sm:break-all min-w-0',
          useMono && 'font-mono text-xs tracking-tight',
        )}
      >
        {value}
      </span>
    </div>
  )
}
