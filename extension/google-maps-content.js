function extractCoordinates(url) {
  const match = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (!match) return null

  return { lat: Number(match[1]), lng: Number(match[2]) }
}

function extractPlace() {
  const url = window.location.href
  const title = document.title.replace(/\s*-\s*Google Maps\s*$/i, '').trim()
  const coordinates = extractCoordinates(url)

  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    return { error: '未能从当前 Google Maps 链接取得坐标。请先打开一个地点详情页后重试。' }
  }

  return {
    place: {
      name: title || '未命名地点',
      lat: coordinates.lat,
      lng: coordinates.lng,
      externalUrl: url,
    },
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRIPCANVAS_CAPTURE_GOOGLE_PLACE') {
    sendResponse(extractPlace())
  }
})
