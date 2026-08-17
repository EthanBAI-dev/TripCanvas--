import type { RoutingAdapter, RoutingRequest } from '../../types/routing.ts'
import { hasGoogleMapsApiKey } from '../google/googleMapsLoader.ts'
import { mapProvider } from '../map/mapProvider.ts'
import { createGoogleRoutingAdapter } from './googleRouting.ts'
import { createOsrmRoutingAdapter } from './osrmRouting.ts'

export type RoutingProvider = 'straight' | 'osrm' | 'google'

const environment = import.meta.env ?? {}
const requestedProvider = environment.VITE_ROUTING_PROVIDER?.trim().toLocaleLowerCase()
const configuredEndpoint = environment.VITE_ROUTING_API_BASE_URL?.trim()

export const routingProvider: RoutingProvider =
  requestedProvider === 'google' ? 'google' : requestedProvider === 'osrm' ? 'osrm' : 'straight'

function createMissingEndpointAdapter(): RoutingAdapter {
  return {
    source: 'osrm',
    calculateRoute: async (_request: RoutingRequest) => {
      throw new Error('已选择 OSRM，但尚未配置 VITE_ROUTING_API_BASE_URL。')
    },
  }
}

export const activeRoutingAdapter: RoutingAdapter | null =
  routingProvider === 'google'
    ? hasGoogleMapsApiKey && mapProvider === 'google'
      ? createGoogleRoutingAdapter()
      : {
          source: 'google',
          calculateRoute: async () => {
            throw new Error('已选择 Google Routes，但尚未配置 API Key。')
          },
        }
    : routingProvider === 'osrm'
    ? configuredEndpoint
      ? createOsrmRoutingAdapter({
          baseUrl: configuredEndpoint,
          drivingProfile: environment.VITE_OSRM_DRIVING_PROFILE?.trim() || 'driving',
          walkingProfile: environment.VITE_OSRM_WALKING_PROFILE?.trim() || 'walking',
        })
      : createMissingEndpointAdapter()
    : null

export const routingProviderLabel =
  routingProvider === 'google'
    ? hasGoogleMapsApiKey && mapProvider === 'google'
      ? 'Google 多点路线'
      : 'Google 路线需启用 Google 地图'
    : routingProvider === 'osrm'
    ? configuredEndpoint
      ? '真实路线'
      : '真实路线未配置'
    : '直线预览'
