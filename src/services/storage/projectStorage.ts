import type { TripCanvasProject } from '../../types/project.ts'

export const PROJECT_STORAGE_KEY = 'tripcanvas-project-v1'

export function hasPersistedProject(): boolean {
  return window.localStorage.getItem(PROJECT_STORAGE_KEY) !== null
}

export function clearPersistedProject(): void {
  window.localStorage.removeItem(PROJECT_STORAGE_KEY)
}

export function isTripCanvasProject(value: unknown): value is TripCanvasProject {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<TripCanvasProject>
  return typeof candidate.id === 'string' && Array.isArray(candidate.places)
}
