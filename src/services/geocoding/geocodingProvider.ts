import type { GeocodingAdapter, GeocodingQuery } from '../../types/geocoding.ts'
import { mockGeocodingAdapter } from './mockGeocoding.ts'
import { createNominatimGeocodingAdapter } from './nominatimGeocoding.ts'

export type GeocodingProvider = 'mock' | 'nominatim'

const environment = import.meta.env ?? {}
const requestedProvider = environment.VITE_GEOCODING_PROVIDER?.trim().toLocaleLowerCase()
const configuredEndpoint = environment.VITE_NOMINATIM_BASE_URL?.trim()

export const geocodingProvider: GeocodingProvider =
  requestedProvider === 'nominatim' ? 'nominatim' : 'mock'

function createMissingEndpointAdapter(): GeocodingAdapter {
  return {
    geocodePlace: async (_query: GeocodingQuery) => {
      throw new Error('已选择 Nominatim，但尚未配置 VITE_NOMINATIM_BASE_URL。')
    },
  }
}

export const activeGeocodingAdapter: GeocodingAdapter =
  geocodingProvider === 'nominatim'
    ? configuredEndpoint
      ? createNominatimGeocodingAdapter({ baseUrl: configuredEndpoint })
      : createMissingEndpointAdapter()
    : mockGeocodingAdapter

export const geocodingProviderLabel =
  geocodingProvider === 'nominatim'
    ? configuredEndpoint
      ? 'OSM geocoding'
      : 'OSM 未配置'
    : 'mock geocoding'
