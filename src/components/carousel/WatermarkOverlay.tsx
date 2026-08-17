import type { WatermarkSettings } from '../../types/carousel.ts'

const POSITION_CLASSES: Record<WatermarkSettings['position'], string> = {
  'top-left': 'left-4 top-4',
  'top-right': 'right-4 top-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
}

export function WatermarkOverlay({ watermark }: { watermark: WatermarkSettings }) {
  const text = watermark.text.trim()
  if (!watermark.enabled || !text) {
    return null
  }

  return (
    <div
      className={`pointer-events-none absolute z-30 max-w-[80%] truncate rounded-full border border-white/60 bg-white/72 px-3 py-1 text-[8px] font-semibold tracking-wide text-ink shadow-sm backdrop-blur ${POSITION_CLASSES[watermark.position]}`}
      data-watermark
      style={{ opacity: watermark.opacity }}
    >
      {text}
    </div>
  )
}
