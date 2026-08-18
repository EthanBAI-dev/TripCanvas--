import { ExportPanel } from '../panels/ExportPanel.tsx'
import { StylePanel } from '../panels/StylePanel.tsx'
import { CarouselPanel } from '../panels/CarouselPanel.tsx'
import { MapDisplayPanel } from '../panels/MapDisplayPanel.tsx'

export function RightPanel() {
  return (
    <aside className="scrollbar-thin flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-sand-200 bg-sand-50/70 p-4">
      <StylePanel />
      <MapDisplayPanel />
      <CarouselPanel />
      <ExportPanel />
    </aside>
  )
}
