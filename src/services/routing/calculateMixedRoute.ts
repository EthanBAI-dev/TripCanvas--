import type { Place } from '../../types/place.ts'
import type { Route, RouteLeg } from '../../types/route.ts'
import type { RouteCalculationResult, RoutableTravelMode } from '../../types/routing.ts'
import { calculateRoute } from './calculateRoute.ts'

function arrivalMode(place: Place, fallback: RoutableTravelMode): RoutableTravelMode {
  return place.arrivalMode ?? fallback
}

function appendGeometry(target: Route['geometry'], geometry: Route['geometry']): void {
  geometry.forEach((point, index) => {
    const last = target.at(-1)
    if (index === 0 && last?.lat === point.lat && last.lng === point.lng) return
    target.push(point)
  })
}

export async function calculateMixedRoute(
  places: Place[],
  fallbackMode: RoutableTravelMode = 'walking',
): Promise<RouteCalculationResult> {
  if (places.length < 2) return { route: null, usedFallback: true }

  const modes = places.slice(1).map((place) => arrivalMode(place, fallbackMode))
  const uniqueModes = new Set(modes)
  if (uniqueModes.size === 1) {
    const result = await calculateRoute(places, modes[0])
    return {
      ...result,
      route: result.route
        ? { ...result.route, legs: result.route.legs.map((leg) => ({ ...leg, travelMode: modes[0] })) }
        : null,
    }
  }

  const results = await Promise.all(
    places.slice(1).map((place, index) => calculateRoute([places[index], place], modes[index])),
  )
  const routes = results.flatMap((result) => result.route ? [result.route] : [])
  if (routes.length !== places.length - 1) return { route: null, usedFallback: true, warning: '部分路段无法计算。' }

  const geometry: Route['geometry'] = []
  const legs: RouteLeg[] = []
  routes.forEach((route, index) => {
    appendGeometry(geometry, route.geometry)
    legs.push(...route.legs.map((leg) => ({ ...leg, travelMode: modes[index] })))
  })
  const firstRoute = routes[0]
  const warning = [...new Set(results.flatMap((result) => result.warning ? [result.warning] : []))].join(' ')

  return {
    route: {
      ...firstRoute,
      name: '混合出行路线',
      placeIds: places.map((place) => place.id),
      geometry,
      legs,
      distanceMeters: routes.reduce((total, route) => total + (route.distanceMeters ?? 0), 0),
      durationSeconds: routes.reduce((total, route) => total + (route.durationSeconds ?? 0), 0),
      source: routes.every((route) => route.source === 'google') ? 'google' : 'straight-line',
    },
    usedFallback: results.some((result) => result.usedFallback),
    warning: warning || undefined,
  }
}
