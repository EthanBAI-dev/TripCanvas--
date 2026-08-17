import { create } from 'zustand'

export type EditorTool = 'select' | 'text' | 'pin' | 'route'

interface EditorState {
  currentTool: EditorTool
  selectedId: string | null
  fitBoundsRequest: number
  isMapReady: boolean
  isExporting: boolean
  setCurrentTool: (tool: EditorTool) => void
  setSelectedId: (id: string | null) => void
  requestFitBounds: () => void
  setMapReady: (isMapReady: boolean) => void
  setIsExporting: (isExporting: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  selectedId: null,
  fitBoundsRequest: 0,
  isMapReady: false,
  isExporting: false,
  setCurrentTool: (currentTool) => set({ currentTool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  requestFitBounds: () => set((state) => ({ fitBoundsRequest: state.fitBoundsRequest + 1 })),
  setMapReady: (isMapReady) => set({ isMapReady }),
  setIsExporting: (isExporting) => set({ isExporting }),
}))
