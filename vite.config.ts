import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { planRouteWithDeepSeek } from './server/deepseekRoutePlanner.ts'
import { calculateGoogleRouteRest, searchGooglePlacesRest } from './server/googleTripApi.ts'

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 32_000) throw new Error('请求内容过大。')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function handleOptions(request: IncomingMessage, response: ServerResponse): boolean {
  if (request.method !== 'OPTIONS') return false
  sendJson(response, 204, null)
  return true
}

function googleApiKey(environment: Record<string, string>): string {
  return environment.GOOGLE_MAPS_API_KEY?.trim() || ''
}

function deepSeekRouteApi(environment: Record<string, string>): Plugin {
  return {
    name: 'tripcanvas-deepseek-route-api',
    configureServer(server) {
      server.middlewares.use('/api/ai/plan-route', async (request, response) => {
        if (handleOptions(request, response)) return
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        try {
          const body = await readJsonBody(request) as { prompt?: unknown }
          if (typeof body.prompt !== 'string' || body.prompt.trim().length < 4 || body.prompt.length > 1_000) {
            sendJson(response, 400, { error: '旅行想法长度不正确。' })
            return
          }
          const plan = await planRouteWithDeepSeek(body.prompt.trim(), {
            apiKey: environment.DEEPSEEK_API_KEY ?? '',
            baseUrl: environment.DEEPSEEK_BASE_URL,
            model: environment.DEEPSEEK_MODEL,
          })
          sendJson(response, 200, plan)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'AI 路线服务失败。'
          sendJson(response, message.includes('尚未配置') ? 503 : 502, { error: message })
        }
      })

      server.middlewares.use('/api/google/places/search', async (request, response) => {
        if (handleOptions(request, response)) return
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        try {
          const body = await readJsonBody(request) as {
            query?: unknown
            locationBias?: { lat?: unknown; lng?: unknown }
          }
          if (typeof body.query !== 'string' || !body.query.trim() || body.query.length > 200) {
            sendJson(response, 400, { error: '地点搜索词不正确。' })
            return
          }
          const locationBias = Number.isFinite(body.locationBias?.lat) && Number.isFinite(body.locationBias?.lng)
            ? { lat: Number(body.locationBias?.lat), lng: Number(body.locationBias?.lng) }
            : undefined
          const candidates = await searchGooglePlacesRest(body.query.trim(), locationBias, {
            apiKey: googleApiKey(environment),
          })
          sendJson(response, 200, { candidates })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Google Places 搜索失败。'
          sendJson(response, message.includes('尚未配置') ? 503 : 502, { error: message })
        }
      })

      server.middlewares.use('/api/google/routes/calculate', async (request, response) => {
        if (handleOptions(request, response)) return
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        try {
          const body = await readJsonBody(request) as {
            travelMode?: unknown
            places?: Array<{ name?: unknown; lat?: unknown; lng?: unknown; arrivalMode?: unknown }>
          }
          const travelMode = body.travelMode === 'driving' ? 'driving' : 'walking'
          if (!Array.isArray(body.places) || body.places.length < 2 || body.places.length > 12) {
            sendJson(response, 400, { error: '路线需要 2–12 个路径点。' })
            return
          }
          const places = body.places.map((place) => ({
            name: typeof place.name === 'string' ? place.name : '',
            lat: Number(place.lat),
            lng: Number(place.lng),
            arrivalMode: place.arrivalMode === 'driving' ? 'driving' as const : 'walking' as const,
          }))
          if (places.some((place) => !place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) {
            sendJson(response, 400, { error: '路径点数据不正确。' })
            return
          }
          const route = await calculateGoogleRouteRest(places, travelMode, { apiKey: googleApiKey(environment) })
          sendJson(response, 200, route)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Google Routes 计算失败。'
          sendJson(response, message.includes('尚未配置') ? 503 : 502, { error: message })
        }
      })

      server.middlewares.use('/api/ai/plan-resolved-route', async (request, response) => {
        if (handleOptions(request, response)) return
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        try {
          const body = await readJsonBody(request) as { prompt?: unknown }
          if (typeof body.prompt !== 'string' || body.prompt.trim().length < 4 || body.prompt.length > 1_000) {
            sendJson(response, 400, { error: '旅行想法长度不正确。' })
            return
          }
          const draft = await planRouteWithDeepSeek(body.prompt.trim(), {
            apiKey: environment.DEEPSEEK_API_KEY ?? '',
            baseUrl: environment.DEEPSEEK_BASE_URL,
            model: environment.DEEPSEEK_MODEL,
          })
          const places = []
          let bias: { lat: number; lng: number } | undefined
          for (const [index, place] of draft.places.entries()) {
            const [candidate] = await searchGooglePlacesRest(
              `${place.searchQuery ?? place.name}, ${draft.city}`,
              bias,
              { apiKey: googleApiKey(environment) },
            )
            if (!candidate) throw new Error(`无法确认「${place.name}」。`)
            bias = { lat: candidate.lat, lng: candidate.lng }
            places.push({
              ...candidate,
              category: place.category,
              note: place.note,
              arrivalMode: index === 0 ? undefined : place.arrivalMode ?? 'walking',
            })
          }
          const route = await calculateGoogleRouteRest(places, places[1]?.arrivalMode ?? 'walking', {
            apiKey: googleApiKey(environment),
          })
          sendJson(response, 200, {
            plan: {
              title: draft.title,
              subtitle: draft.subtitle,
              city: draft.city,
              canvasRatio: draft.canvasRatio,
              places,
              ...route,
            },
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'AI 路线规划失败。'
          sendJson(response, message.includes('尚未配置') ? 503 : 502, { error: message })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [deepSeekRouteApi(environment), react(), tailwindcss()],
  }
})
