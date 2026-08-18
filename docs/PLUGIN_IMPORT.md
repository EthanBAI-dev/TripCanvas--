# TripCanvas 浏览器插件导入契约

TripCanvas 页面监听同源 `window.postMessage` 和 `tripcanvas:import-route` 自定义事件。浏览器扩展的 content script 可以把在 Google Maps 中收集的目的地一次发送到编辑器。

## 消息格式

```ts
interface TripCanvasImportMessage {
  type: 'TRIPCANVAS_IMPORT_ROUTE'
  payload: {
    title?: string
    subtitle?: string
    city?: string
    canvasRatio?: '3:4' | '4:5' | '9:16'
    travelMode: 'walking' | 'driving'
    places: Array<{
      name: string
      address?: string
      category?: 'start' | 'end' | 'food' | 'coffee' | 'shopping' | 'photo' | 'hotel' | 'sight' | 'transport' | 'custom'
      note?: string
      imageUrl?: string
      lat: number
      lng: number
      externalUrl?: string
      googlePlaceId?: string
    }>
  }
}
```

`places` 至少 2 个、最多 27 个，对应起点、最多 25 个中途停靠点和终点。`externalUrl` 与 `imageUrl` 只接受 `http`/`https`。图片服务器需要允许跨域读取，否则浏览器可预览但 PNG 导出可能无法嵌入。若只传 `googlePlaceId`，TripCanvas 会生成标准 Google Maps Search 链接。

## Content script 示例

```js
const message = {
  type: 'TRIPCANVAS_IMPORT_ROUTE',
  payload: {
    title: '涩谷到表参道 City Walk',
    city: 'Tokyo',
    travelMode: 'walking',
    places: [
      {
        name: '涩谷站',
        lat: 35.658034,
        lng: 139.701636,
        note: '从八公口出发',
        externalUrl: 'https://www.google.com/maps/search/?api=1&query=Shibuya+Station',
      },
      {
        name: '表参道',
        lat: 35.665247,
        lng: 139.712314,
        note: '终点逛店',
        externalUrl: 'https://www.google.com/maps/search/?api=1&query=Omotesando',
      },
    ],
  },
}

window.postMessage(message, window.location.origin)
```

导入数据会经过 Zod 运行时校验。校验通过后，TripCanvas 统一创建 `Place`、路线、逐段数据和标注，并保存到 Project JSON/localStorage。若真实路线服务不可用，会保留所有站点内容并回退为带估算逐段时间的直线预览。
