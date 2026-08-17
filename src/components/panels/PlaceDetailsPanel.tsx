import { useEffect, useState } from 'react'
import { useProjectStore } from '../../store/projectStore.ts'
import type { PlaceCategory } from '../../types/place.ts'
import { getSafeExternalUrl } from '../../utils/url.ts'
import { PanelSection } from './PanelSection.tsx'

const CATEGORY_OPTIONS: Array<{ value: PlaceCategory; label: string }> = [
  { value: 'start', label: '路线起点' },
  { value: 'end', label: '路线终点' },
  { value: 'food', label: '美食' },
  { value: 'coffee', label: '咖啡' },
  { value: 'shopping', label: '购物' },
  { value: 'photo', label: '拍照' },
  { value: 'hotel', label: '住宿' },
  { value: 'sight', label: '景点' },
  { value: 'transport', label: '交通' },
  { value: 'custom', label: '自定义' },
]

const fieldClassName =
  'mt-1.5 block w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15'

export function PlaceDetailsPanel() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const places = useProjectStore((state) => state.project.places)
  const updatePlace = useProjectStore((state) => state.updatePlace)
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0]
  const safeExternalUrl = getSafeExternalUrl(selectedPlace?.externalUrl)

  useEffect(() => {
    if (selectedPlace && selectedPlace.id !== selectedPlaceId) {
      setSelectedPlaceId(selectedPlace.id)
    }
  }, [selectedPlace, selectedPlaceId])

  return (
    <PanelSection
      title="站点详情"
      action={<span className="text-xs text-ink-muted">{selectedPlace ? `${places.indexOf(selectedPlace) + 1} / ${places.length}` : '未生成'}</span>}
    >
      {!selectedPlace ? (
        <p className="text-xs leading-5 text-ink-muted">生成地点后，可在这里补充站点名称、地址、分类和攻略文案。</p>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-select">
            选择站点
            <select
              className={fieldClassName}
              id="place-detail-select"
              onChange={(event) => setSelectedPlaceId(event.target.value)}
              value={selectedPlace.id}
            >
              {places.map((place, index) => (
                <option key={place.id} value={place.id}>
                  {index + 1}. {place.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-name">
            站点名称
            <input
              className={fieldClassName}
              id="place-detail-name"
              onChange={(event) => updatePlace(selectedPlace.id, { name: event.target.value })}
              value={selectedPlace.name}
            />
          </label>

          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-address">
            地址
            <input
              className={fieldClassName}
              id="place-detail-address"
              onChange={(event) => updatePlace(selectedPlace.id, { address: event.target.value })}
              placeholder="补充街区或详细地址"
              value={selectedPlace.address ?? ''}
            />
          </label>

          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-category">
            分类
            <select
              className={fieldClassName}
              id="place-detail-category"
              onChange={(event) => updatePlace(selectedPlace.id, { category: event.target.value as PlaceCategory })}
              value={selectedPlace.category}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-note">
            攻略文案
            <textarea
              className={`${fieldClassName} min-h-24 resize-y leading-5`}
              id="place-detail-note"
              onChange={(event) => updatePlace(selectedPlace.id, { note: event.target.value })}
              placeholder="写下推荐理由、拍照提示或停留时间"
              value={selectedPlace.note ?? ''}
            />
          </label>

          <label className="block text-xs font-medium text-ink-muted" htmlFor="place-detail-link">
            点击打开的链接
            <input
              className={fieldClassName}
              id="place-detail-link"
              onChange={(event) => updatePlace(selectedPlace.id, { externalUrl: event.target.value })}
              placeholder="https://www.google.com/maps/..."
              type="url"
              value={selectedPlace.externalUrl ?? ''}
            />
          </label>
          {safeExternalUrl ? (
            <a
              className="inline-flex text-xs font-medium text-coral-dark underline-offset-4 hover:underline"
              href={safeExternalUrl}
              rel="noreferrer"
              target="_blank"
            >
              在 Google Maps 中打开 ↗
            </a>
          ) : null}
        </div>
      )}
    </PanelSection>
  )
}
