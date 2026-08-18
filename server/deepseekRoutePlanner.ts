import { z } from 'zod'
import { aiRoutePlanSchema } from '../src/services/ai/aiRoutePlanSchema.ts'
import type { AiRoutePlan } from '../src/types/aiRoutePlan.ts'

interface DeepSeekRoutePlannerOptions {
  apiKey: string
  baseUrl?: string
  model?: string
}

const deepSeekResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
})

const SYSTEM_PROMPT = `你是 TripCanvas 的旅行路线规划器。请根据用户需求只输出 JSON，不要输出 Markdown 或解释。

JSON 必须符合：
{
  "title": "80 字以内标题",
  "subtitle": "可选，120 字以内副标题",
  "city": "便于 Google Places 搜索的城市名",
  "canvasRatio": "3:4 | 4:5 | 9:16",
  "places": [
    {
      "name": "真实存在的地点名称",
      "searchQuery": "包含城市和必要区域信息的精确 Google Places 搜索词",
      "category": "start | end | food | coffee | shopping | photo | hotel | sight | transport | custom",
      "note": "面向旅行读者的简洁中文说明，包含体验或实用提示，不超过 120 字",
      "arrivalMode": "walking | driving，第一站省略"
    }
  ]
}

规则：
- 除非用户明确要求更多站点，默认规划 3 到 6 个真实、顺路、符合主题的地点；绝不为了凑数量加入远处地点。
- 用户提出“半日/半天”时，规划 3 到 5 个地点；提出“不想走太远/短距离/轻松”时，地点必须集中在同一片区域，步行路线总长以 5 公里内为目标。
- 用户没有指定城市内区域时，优先围绕起点、终点和主题选择连续街区。
- 第一站 category=start，最后一站 category=end。
- 不得生成坐标、图片 URL、Place ID、路线 geometry 或不存在的店铺。
- 不确定具体店铺时选择稳定知名的地点，不要编造。
- 用户说不想走太远时压缩区域，并让相邻站点适合步行。
- 每个 note 都要具体、简洁，避免“值得一去”等空话。
- 输出必须是可直接 JSON.parse 的 JSON 对象。`

function parseJsonContent(content: string): unknown {
  const normalized = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  if (!normalized) throw new Error('DeepSeek 返回了空内容。')
  return JSON.parse(normalized)
}

function normalizePlan(plan: AiRoutePlan): AiRoutePlan {
  return {
    ...plan,
    places: plan.places.map((place, index) => ({
      ...place,
      category: index === 0 ? 'start' : index === plan.places.length - 1 ? 'end' : place.category,
      arrivalMode: index === 0 ? undefined : place.arrivalMode ?? 'walking',
    })),
  }
}

export async function planRouteWithDeepSeek(
  prompt: string,
  options: DeepSeekRoutePlannerOptions,
): Promise<AiRoutePlan> {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new Error('服务端尚未配置 DEEPSEEK_API_KEY。')
  const baseUrl = (options.baseUrl?.trim() || 'https://api.deepseek.com').replace(/\/$/, '')
  const model = options.model?.trim() || 'deepseek-v4-flash'

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请将下面的旅行想法规划为 JSON 路线：\n${prompt}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1_800,
        thinking: { type: 'disabled' },
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek 请求失败（${response.status}）。`)
    }
    const envelope = deepSeekResponseSchema.safeParse(await response.json())
    if (!envelope.success) throw new Error('DeepSeek 返回结构不正确。')
    const content = envelope.data.choices[0].message.content?.trim()
    if (!content && attempt === 0) continue

    let json: unknown
    try {
      json = parseJsonContent(content ?? '')
    } catch {
      throw new Error('DeepSeek 没有返回有效 JSON。')
    }
    const plan = aiRoutePlanSchema.safeParse(json)
    if (!plan.success) throw new Error('DeepSeek 路线未通过 TripCanvas 结构校验。')
    return normalizePlan(plan.data)
  }

  throw new Error('DeepSeek 连续返回空内容，请稍后重试。')
}
