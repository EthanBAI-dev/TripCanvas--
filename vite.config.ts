import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { planRouteWithDeepSeek } from './server/deepseekRoutePlanner.ts'

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
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function deepSeekRouteApi(environment: Record<string, string>): Plugin {
  return {
    name: 'tripcanvas-deepseek-route-api',
    configureServer(server) {
      server.middlewares.use('/api/ai/plan-route', async (request, response) => {
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
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [deepSeekRouteApi(environment), react(), tailwindcss()],
  }
})
