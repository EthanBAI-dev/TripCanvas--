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
let lastPreviewPayload = null
let lastMapUrl = window.location.href

function getMapCamera() {
  const match = window.location.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/)
  if (!match) return null
  return { lat: Number(match[1]), lng: Number(match[2]), zoom: Number(match[3]) }
}

function toWorldPoint({ lat, lng }, zoom) {
  const scale = 256 * 2 ** zoom
  const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180)
  return {
    x: (lng + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

function renderRoutePath(frame, payload) {
  const camera = getMapCamera()
  if (!camera || !Array.isArray(payload.geometry) || payload.geometry.length < 2) return
  const frameRect = frame.getBoundingClientRect()
  const center = toWorldPoint(camera, camera.zoom)
  const projectPoint = (point) => {
    const world = toWorldPoint(point, camera.zoom)
    return {
      x: window.innerWidth / 2 + world.x - center.x - frameRect.left,
      y: window.innerHeight / 2 + world.y - center.y - frameRect.top,
    }
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${frameRect.width} ${frameRect.height}`)
  Object.assign(svg.style, { inset: '0', position: 'absolute', zIndex: '1' })
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', payload.geometry.map((point, index) => {
    const projected = projectPoint(point)
    return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`
  }).join(' '))
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', '#0284c7')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  path.setAttribute('stroke-width', '6')
  path.setAttribute('style', 'filter:drop-shadow(0 2px 2px rgba(255,255,255,.9))')
  svg.append(path)

  payload.places.forEach((place, index) => {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return
    const point = projectPoint(place)
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', String(point.x))
    circle.setAttribute('cy', String(point.y))
    circle.setAttribute('r', '10')
    circle.setAttribute('fill', '#fb7185')
    circle.setAttribute('stroke', '#fff')
    circle.setAttribute('stroke-width', '3')
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(point.x))
    label.setAttribute('y', String(point.y + 3.5))
    label.setAttribute('fill', '#fff')
    label.setAttribute('font-family', 'system-ui, sans-serif')
    label.setAttribute('font-size', '10')
    label.setAttribute('font-weight', '700')
    label.setAttribute('text-anchor', 'middle')
    label.textContent = String(index + 1)
    svg.append(circle, label)
  })
  frame.prepend(svg)
}

function renderPreview(payload) {
  lastPreviewPayload = payload
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
    overflow: 'hidden',
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
    zIndex: '2',
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
    zIndex: '2',
  })
  if (payload.routeSummary) {
    const summary = document.createElement('strong')
    const distance = payload.routeSummary.distanceMeters >= 1000
      ? `${(payload.routeSummary.distanceMeters / 1000).toFixed(1)} km`
      : `${payload.routeSummary.distanceMeters} m`
    const minutes = Math.max(1, Math.round(payload.routeSummary.durationSeconds / 60))
    summary.textContent = `${distance} · ${minutes} 分钟`
    Object.assign(summary.style, {
      color: '#0369a1',
      flexBasis: '100%',
      font: '700 11px/1.2 system-ui, sans-serif',
      marginBottom: '2px',
    })
    stops.append(summary)
  }
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
  window.requestAnimationFrame(() => renderRoutePath(frame, payload))
}

window.setInterval(() => {
  if (window.location.href === lastMapUrl) return
  lastMapUrl = window.location.href
  if (lastPreviewPayload?.visible) renderPreview(lastPreviewPayload)
}, 600)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRIPCANVAS_CAPTURE_GOOGLE_PLACE') {
    sendResponse(extractPlace())
  }
  if (message?.type === 'TRIPCANVAS_PREVIEW_ROUTE') {
    renderPreview(message.payload)
    sendResponse({ ok: true })
  }
})
