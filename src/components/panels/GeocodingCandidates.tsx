import type { GeocodingSelections } from '../../services/geocoding/resolveGeocodingResults.ts'
import type { GeocodingResult } from '../../types/geocoding.ts'
import type { Place } from '../../types/place.ts'

interface GeocodingCandidatesProps {
  results: GeocodingResult[]
  selections: GeocodingSelections
  onSelect: (resultIndex: number, place: Place) => void
}

export function GeocodingCandidates({ results, selections, onSelect }: GeocodingCandidatesProps) {
  const ambiguousResults = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.status === 'needs-selection')

  if (ambiguousResults.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-950">请选择匹配地点</p>

      {ambiguousResults.map(({ result, index }) => (
        <fieldset className="space-y-2" key={`${result.query.name}-${index}`}>
          <legend className="text-xs text-amber-900">“{result.query.name}”有多个结果</legend>
          <div className="space-y-2">
            {result.candidates?.map((candidate) => {
              const isSelected = selections[index]?.id === candidate.id

              return (
                <button
                  aria-pressed={isSelected}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-coral bg-white shadow-sm'
                      : 'border-amber-200 bg-white/70 hover:border-amber-400'
                  }`}
                  key={candidate.id}
                  onClick={() => onSelect(index, candidate)}
                  type="button"
                >
                  <span className="block text-sm font-medium text-ink">{candidate.name}</span>
                  {candidate.address ? (
                    <span className="mt-0.5 block text-xs text-ink-muted">{candidate.address}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
