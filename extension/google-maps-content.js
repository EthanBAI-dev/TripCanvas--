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

const previewId = 'tripcanvas-map-preview'

function renderPreview(payload) {
  document.getElementById(previewId)?.remove()
  if (!payload?.visible) return

  const ratios = { '3:4': '3 / 4', '4:5': '4 / 5', '9:16': '9 / 16' }
  const frame = document.createElement('aside')
  frame.id = previewId
  frame.setAttribute('aria-hidden', 'true')
  Object.assign(frame.style, {
    aspectRatio: ratios[payload.canvasRatio] ?? '3 / 4',
    border: '3px solid #0284c7',
    borderRadius: '18px',
    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.28), 0 18px 50px rgba(15, 23, 42, 0.24)',
    color: '#17324d',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    left: '50%',
    maxHeight: '74vh',
    pointerEvents: 'none',
    position: 'fixed',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: payload.canvasRatio === '9:16' ? 'min(34vw, 360px)' : 'min(42vw, 480px)',
    zIndex: '2147483646',
  })

  const heading = document.createElement('div')
  Object.assign(heading.style, {
    background: 'linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.72))',
    borderRadius: '14px 14px 12px 12px',
    margin: '12px',
    padding: '14px 16px',
  })
  const title = document.createElement('strong')
  title.textContent = payload.title || '我的旅行路线'
  Object.assign(title.style, { display: 'block', font: '700 20px/1.25 system-ui, sans-serif' })
  const subtitle = document.createElement('small')
  subtitle.textContent = payload.subtitle || 'TripCanvas 路线预览'
  Object.assign(subtitle.style, { display: 'block', font: '500 12px/1.4 system-ui, sans-serif', marginTop: '5px', opacity: '.68' })
  heading.append(title, subtitle)

  const stops = document.createElement('div')
  Object.assign(stops.style, {
    background: 'rgba(255,255,255,.9)',
    borderRadius: '12px 12px 14px 14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    margin: '12px',
    padding: '10px',
  })
  payload.places.slice(0, 8).forEach((place, index) => {
    const chip = document.createElement('span')
    chip.textContent = `${index + 1} ${place.name}`
    Object.assign(chip.style, {
      background: index === 0 ? '#0284c7' : '#e0f2fe',
      borderRadius: '999px',
      color: index === 0 ? '#fff' : '#075985',
      font: '700 11px/1 system-ui, sans-serif',
      maxWidth: '150px',
      overflow: 'hidden',
      padding: '7px 9px',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    })
    stops.append(chip)
  })
  if (payload.places.length === 0) {
    const empty = document.createElement('small')
    empty.textContent = '在侧边栏添加路径点'
    Object.assign(empty.style, { font: '500 12px system-ui, sans-serif', opacity: '.65' })
    stops.append(empty)
  }

  frame.append(heading, stops)
  document.documentElement.append(frame)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRIPCANVAS_CAPTURE_GOOGLE_PLACE') {
    sendResponse(extractPlace())
  }
  if (message?.type === 'TRIPCANVAS_PREVIEW_ROUTE') {
    renderPreview(message.payload)
    sendResponse({ ok: true })
  }
})
