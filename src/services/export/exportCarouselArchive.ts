import JSZip from 'jszip'
import type { CarouselPage } from '../../types/carousel.ts'
import type { ExportSize } from '../../types/project.ts'
import { exportToPng, waitForNextPaint } from './exportToPng.ts'

interface CarouselExportTarget {
  node: HTMLElement
  page: CarouselPage
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function filenamePart(page: CarouselPage): string {
  if (page.type === 'cover') {
    return 'cover'
  }

  if (page.type === 'route') {
    return 'route'
  }

  return `place-${pad((page.placeIndex ?? 0) + 1)}`
}

function createArchiveFilename(date = new Date()): string {
  const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}`
  return `tripcanvas-carousel-${datePart}-${timePart}.zip`
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.download = filename
  anchor.href = objectUrl
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function exportCarouselArchive(
  targets: CarouselExportTarget[],
  exportSize: ExportSize,
  onProgress?: (completed: number, total: number) => void,
): Promise<string> {
  const archive = new JSZip()

  for (const [index, target] of targets.entries()) {
    await waitForNextPaint()
    const dataUrl = await exportToPng(target.node, exportSize)
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    archive.file(`${pad(index + 1)}-${filenamePart(target.page)}.png`, base64, { base64: true })
    onProgress?.(index + 1, targets.length)
  }

  const filename = createArchiveFilename()
  const blob = await archive.generateAsync({ type: 'blob' })
  downloadBlob(blob, filename)
  return filename
}
