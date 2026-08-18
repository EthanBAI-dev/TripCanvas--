import type { AiRoutePlan } from '../../types/aiRoutePlan.ts'
import { aiRoutePlanSchema } from './aiRoutePlanSchema.ts'

const endpoint = import.meta.env.VITE_AI_ROUTE_ENDPOINT?.trim()

export async function planRouteWithAi(prompt: string): Promise<AiRoutePlan> {
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) throw new Error('请输入旅行路线想法。')
  if (!endpoint) {
    throw new Error('尚未配置 AI 路线服务。请设置 VITE_AI_ROUTE_ENDPOINT。')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: normalizedPrompt,
      locale: 'zh-CN',
      schemaVersion: '1',
    }),
  })
  if (!response.ok) {
    throw new Error(`AI 路线服务请求失败（${response.status}）。`)
  }

  const payload: unknown = await response.json()
  const result = aiRoutePlanSchema.safeParse(payload)
  if (!result.success) {
    throw new Error('AI 返回的路线草案格式不正确。')
  }
  return result.data
}

