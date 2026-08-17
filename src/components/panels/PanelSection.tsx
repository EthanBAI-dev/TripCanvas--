import type { PropsWithChildren, ReactNode } from 'react'

interface PanelSectionProps {
  title: string
  action?: ReactNode
}

export function PanelSection({ children, title, action }: PropsWithChildren<PanelSectionProps>) {
  return (
    <section className="rounded-2xl border border-sand-200/90 bg-white/95 p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
