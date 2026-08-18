# AI Route API Contract

TripCanvas keeps model credentials on a server. The Web App and Chrome Side Panel call the URL configured by `VITE_AI_ROUTE_ENDPOINT`; they never receive an OpenAI, Gemini, or other model API key.

## Request

`POST VITE_AI_ROUTE_ENDPOINT`

```json
{
  "prompt": "东京涩谷到表参道，咖啡、拍照、买手店，不想走太远",
  "locale": "zh-CN",
  "schemaVersion": "1"
}
```

## Response

Return JSON only. TripCanvas validates this response before calling Google Places.

```json
{
  "title": "涩谷到表参道半日 City Walk",
  "subtitle": "咖啡、拍照与买手店的一条顺路路线",
  "city": "Tokyo",
  "canvasRatio": "3:4",
  "places": [
    {
      "name": "Shibuya Scramble Square",
      "searchQuery": "Shibuya Scramble Square Tokyo",
      "category": "start",
      "note": "从高层观景台俯瞰涩谷，建议预留 45 分钟。"
    },
    {
      "name": "Koffee Mameya",
      "searchQuery": "Koffee Mameya Omotesando Tokyo",
      "category": "coffee",
      "note": "专注手冲体验，热门时段可能排队。",
      "arrivalMode": "walking"
    }
  ]
}
```

Rules enforced by the client:

- 2–12 places.
- `category` must be one of the TripCanvas place categories.
- `arrivalMode` is `walking` or `driving`; the first place does not need it.
- Each note is required and limited to 120 characters.
- AI-provided coordinates and image URLs are ignored. TripCanvas resolves every place through Google Places, then obtains the route through Google Routes.
- If any place cannot be resolved, the existing Side Panel project is left unchanged.

The server should return a non-2xx response for authentication, quota, model, or validation failures. Do not return partial route data.

## Photo handling

TripCanvas uses the first Google Places photo for each resolved place. The photo URI is refreshed by a new Places request rather than treated as a permanent asset. The author attribution and Google Maps source URL travel with the project and are rendered on detail pages.

