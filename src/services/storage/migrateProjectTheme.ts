import type { TripCanvasProject } from '../../types/project.ts'

const LEGACY_COLORS: Record<string, string> = {
  '#2d2926': '#17343d',
  '#d96c4b': '#087f78',
  '#e56e5a': '#0f9d94',
}

function migrateColor(color: string | undefined): string | undefined {
  return color ? (LEGACY_COLORS[color.toLocaleLowerCase()] ?? color) : color
}

export function migrateProjectTheme(project: TripCanvasProject): TripCanvasProject {
  return {
    ...project,
    routes: project.routes.map((route) => ({
      ...route,
      style: { ...route.style, color: migrateColor(route.style.color) ?? route.style.color },
    })),
    annotations: project.annotations.map((annotation) => ({
      ...annotation,
      style: {
        ...annotation.style,
        backgroundColor: migrateColor(annotation.style.backgroundColor),
        color: migrateColor(annotation.style.color),
      },
    })),
  }
}
