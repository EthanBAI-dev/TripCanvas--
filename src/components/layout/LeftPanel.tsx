import { PlacesPanel } from '../panels/PlacesPanel.tsx'
import { PlaceDetailsPanel } from '../panels/PlaceDetailsPanel.tsx'
import { PromptPanel } from '../panels/PromptPanel.tsx'
import { TemplatePanel } from '../panels/TemplatePanel.tsx'
import { PluginImportPanel } from '../panels/PluginImportPanel.tsx'

export function LeftPanel() {
  return (
    <aside className="scrollbar-thin flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-sand-200 bg-sand-50/70 p-4">
      <PromptPanel />
      <TemplatePanel />
      <PlacesPanel />
      <PluginImportPanel />
      <PlaceDetailsPanel />
    </aside>
  )
}
