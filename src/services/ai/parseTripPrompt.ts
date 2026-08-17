import type { PlaceCategory } from '../../types/place.ts'
import type { TravelMode } from '../../types/route.ts'
import type { TripDraft, TripDraftPlace } from '../../types/tripDraft.ts'
import { tripDraftSchema } from './tripDraftSchema.ts'

interface RecognizedPlace {
  aliases: string[]
  name: string
}

const TOKYO_PLACES: RecognizedPlace[] = [
  { aliases: ['东京站', 'tokyo station'], name: '东京站' },
  { aliases: ['银座', 'ginza'], name: '银座' },
  { aliases: ['筑地市场', 'tsukiji market', '筑地'], name: '筑地市场' },
  { aliases: ['东京塔', 'tokyo tower'], name: '东京塔' },
  { aliases: ['涩谷站', '涩谷', 'shibuya station', 'shibuya'], name: '涩谷站' },
  { aliases: ['表参道', 'omotesando'], name: '表参道' },
]

function categoryForIndex(index: number, total: number): PlaceCategory {
  if (index === 0) {
    return 'start'
  }

  if (index === total - 1) {
    return 'end'
  }

  return 'custom'
}

function extractPlaces(prompt: string): TripDraftPlace[] {
  const normalizedPrompt = prompt.toLocaleLowerCase()
  const recognized = TOKYO_PLACES.filter((place) =>
    place.aliases.some((alias) => normalizedPrompt.includes(alias.toLocaleLowerCase())),
  )
  const uniqueNames = [...new Set(recognized.map((place) => place.name))]

  if (uniqueNames.length < 2 && /东京|tokyo/i.test(prompt)) {
    for (const fallback of ['东京站', '银座', '筑地市场', '东京塔']) {
      if (!uniqueNames.includes(fallback)) {
        uniqueNames.push(fallback)
      }
    }
  }

  return uniqueNames.map((name, index) => ({
    name,
    category: categoryForIndex(index, uniqueNames.length),
  }))
}

function extractThemes(prompt: string): string[] {
  const themes = [
    [/咖啡|coffee/i, 'coffee'],
    [/拍照|摄影|photo/i, 'photo'],
    [/买手店|购物|shopping/i, 'shopping'],
    [/city\s*walk|漫步|散步/i, 'citywalk'],
    [/美食|吃|food/i, 'food'],
  ] as const

  return themes.filter(([pattern]) => pattern.test(prompt)).map(([, theme]) => theme)
}

function extractTravelMode(prompt: string): TravelMode {
  if (/自驾|开车|driv/i.test(prompt)) {
    return 'driving'
  }

  if (/骑行|自行车|cycl/i.test(prompt)) {
    return 'cycling'
  }

  if (/公交|地铁|公共交通|transit/i.test(prompt)) {
    return 'transit'
  }

  return 'walking'
}

function createMockDraft(prompt: string): TripDraft {
  const places = extractPlaces(prompt)
  if (places.length < 2) {
    throw new Error('当前 mock AI 仅支持包含两个东京演示地点的描述。')
  }

  const themes = extractThemes(prompt)
  const durationLabel = /半日|半天/i.test(prompt) ? '半日 ' : /一日|一天/i.test(prompt) ? '一日 ' : ''

  return {
    title: `${places[0].name}到${places.at(-1)?.name ?? places[0].name}${durationLabel}City Walk`,
    city: 'Tokyo',
    theme: themes,
    travelMode: extractTravelMode(prompt),
    places,
    styleSuggestion: {
      routeColor: themes.includes('coffee') ? '#087f78' : '#0f9d94',
      labelStyle: 'xiaohongshu',
      canvasRatio: '3:4',
    },
  }
}

export async function parseTripPrompt(prompt: string): Promise<TripDraft> {
  const draft = createMockDraft(prompt.trim())
  const result = tripDraftSchema.safeParse(draft)

  if (!result.success) {
    throw new Error('AI 返回的旅行草案未通过结构校验。')
  }

  return result.data
}
