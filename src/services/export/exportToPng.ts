import { toPng } from 'html-to-image'
import type { ExportSize } from '../../types/project.ts'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function createExportFilename(date = new Date()): string {
  const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}`

  return `tripcanvas-${datePart}-${timePart}.png`
}

export async function waitForNextPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const pendingImages = Array.from(node.querySelectorAll('img')).filter(
    (image) => !image.complete,
  )
  if (pendingImages.length === 0) {
    return
  }

  await Promise.race([
    Promise.all(
      pendingImages.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ),
    new Promise<void>((resolve) => window.setTimeout(resolve, 10_000)),
  ])
}

export async function exportToPng(node: HTMLElement, exportSize: ExportSize): Promise<string> {
  await waitForImages(node)
  return toPng(node, {
    backgroundColor: '#ffffff',
    cacheBust: true,
    canvasHeight: exportSize.height,
    canvasWidth: exportSize.width,
    filter: (candidate) =>
      !(candidate instanceof HTMLElement && candidate.hasAttribute('data-export-ignore')),
    pixelRatio: 1,
    skipAutoScale: true,
    skipFonts: true,
  })
}

export function downloadPng(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.download = filename
  anchor.href = dataUrl
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
