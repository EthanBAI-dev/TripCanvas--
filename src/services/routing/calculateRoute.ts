import type { Place } from '../../types/place.ts'
import type { TravelMode } from '../../types/route.ts'
import type { RouteCalculationResult, RoutingAdapter, RoutableTravelMode } from '../../types/routing.ts'
import { createStraightLineRoute } from './createStraightLineRoute.ts'
import { activeRoutingAdapter } from './routingProvider.ts'

function isRoutableTravelMode(travelMode: TravelMode): travelMode is RoutableTravelMode {
  return travelMode === 'walking' || travelMode === 'driving'
}

export async function calculateRoute(
  places: Place[],
  travelMode: TravelMode,
  adapter: RoutingAdapter | null = activeRoutingAdapter,
): Promise<RouteCalculationResult> {
  const fallback = createStraightLineRoute(places, travelMode)
  if (!fallback || !adapter) {
    return { route: fallback, usedFallback: true }
  }

  if (!isRoutableTravelMode(travelMode)) {
    return {
      route: fallback,
      usedFallback: true,
      warning: '当前路线服务仅支持步行和驾车，已使用直线预览。',
    }
  }

  try {
    const draft = await adapter.calculateRoute({ places, travelMode })
    return {
      route: {
        ...fallback,
        geometry: draft.geometry,
        distanceMeters: draft.distanceMeters,
        durationSeconds: draft.durationSeconds,
        legs: draft.legs,
        source: adapter.source,
      },
      usedFallback: false,
    }
  } catch (error) {
    const detail = error instanceof Error && error.message ? `（${error.message}）` : ''
    return {
      route: fallback,
      usedFallback: true,
      warning: `真实路线暂时不可用${detail}，已使用直线预览。`,
    }
  }
}
