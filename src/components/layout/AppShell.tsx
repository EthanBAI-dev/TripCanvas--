import { TripCanvasEditor } from '../editor/TripCanvasEditor.tsx'
import { LeftPanel } from './LeftPanel.tsx'
import { RightPanel } from './RightPanel.tsx'
import { TopBar } from './TopBar.tsx'
import { CarouselExportFrames } from '../carousel/CarouselExportFrames.tsx'
import { ExtensionBridge } from '../extension/ExtensionBridge.tsx'

export function AppShell() {
  return (
    <div className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-sand-50 text-ink">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <LeftPanel />
        <TripCanvasEditor />
        <RightPanel />
      </main>
      <CarouselExportFrames />
      <ExtensionBridge />
    </div>
  )
}
