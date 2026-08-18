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

function toNormalizedMercator({ lat, lng }) {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat))
  const sin = Math.sin(clampedLat * Math.PI / 180)
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  }
}

function fromNormalizedMercator({ x, y }) {
  const lng = x * 360 - 180
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI
  return { lat, lng }
}

function calculatePreviewCamera(payload) {
  const frame = document.getElementById(previewId)
  const frameRect = frame?.getBoundingClientRect()
  const ratioValues = { '3:4': 3 / 4, '4:5': 4 / 5, '9:16': 9 / 16 }
  const ratio = ratioValues[payload.canvasRatio] ?? 3 / 4
  const fallbackHeight = Math.min(window.innerHeight * 0.74, 640)
  const width = frameRect?.width ?? fallbackHeight * ratio
  const height = frameRect?.height ?? fallbackHeight
  const left = frameRect?.left ?? (window.innerWidth - width) / 2
  const top = frameRect?.top ?? (window.innerHeight - height) / 2
  const points = [...(payload.geometry ?? []), ...(payload.places ?? [])]
    .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
    .map(toNormalizedMercator)
  if (!points.length) return null

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const sidePadding = Math.min(54, width * 0.14)
  const topReserve = Math.min(132, height * 0.26)
  const bottomReserve = Math.min(122, height * 0.24)
  const usableWidth = Math.max(80, width - sidePadding * 2)
  const usableHeight = Math.max(80, height - topReserve - bottomReserve)
  const spanX = Math.max(maxX - minX, 1e-7)
  const spanY = Math.max(maxY - minY, 1e-7)
  const zoomX = Math.log2(usableWidth / (256 * spanX))
  const zoomY = Math.log2(usableHeight / (256 * spanY))
  const zoom = Math.max(3, Math.min(18, Math.floor(Math.min(zoomX, zoomY) * 10) / 10))
  const scale = 256 * 2 ** zoom
  const boundsCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  const desiredScreenCenter = {
    x: left + width / 2,
    y: top + topReserve + usableHeight / 2,
  }
  const cameraCenter = {
    x: boundsCenter.x + (window.innerWidth / 2 - desiredScreenCenter.x) / scale,
    y: boundsCenter.y + (window.innerHeight / 2 - desiredScreenCenter.y) / scale,
  }

  return { ...fromNormalizedMercator(cameraCenter), zoom }
}

function renderRoutePath(frame, payload) {
  const camera = getMapCamera()
  if (!Array.isArray(payload.geometry) || payload.geometry.length < 2) return
  const frameRect = frame.getBoundingClientRect()
  let projectPoint

  if (camera) {
    const center = toWorldPoint(camera, camera.zoom)
    projectPoint = (point) => {
      const world = toWorldPoint(point, camera.zoom)
      return {
        x: window.innerWidth / 2 + world.x - center.x - frameRect.left,
        y: window.innerHeight / 2 + world.y - center.y - frameRect.top,
      }
    }
  } else {
    const points = [...payload.geometry, ...payload.places]
    const lngs = points.map((point) => point.lng)
    const lats = points.map((point) => point.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const padding = 42
    const lngRange = Math.max(maxLng - minLng, 0.0001)
    const latRange = Math.max(maxLat - minLat, 0.0001)
    projectPoint = (point) => ({
      x: padding + (point.lng - minLng) / lngRange * (frameRect.width - padding * 2),
      y: padding + (maxLat - point.lat) / latRange * (frameRect.height - padding * 2),
    })
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${frameRect.width} ${frameRect.height}`)
  Object.assign(svg.style, { inset: '0', position: 'absolute', zIndex: '1' })
  const segments = Array.isArray(payload.segments) && payload.segments.length
    ? payload.segments
    : [{ travelMode: 'walking', geometry: payload.geometry }]
  segments.forEach((segment) => {
    if (!Array.isArray(segment.geometry) || segment.geometry.length < 2) return
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', segment.geometry.map((point, index) => {
      const projected = projectPoint(point)
      return `${index === 0 ? 'M' : 'L'}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`
    }).join(' '))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', segment.travelMode === 'driving' ? '#0f766e' : '#0284c7')
    path.setAttribute('stroke-dasharray', segment.travelMode === 'driving' ? '0' : '10 5')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('stroke-width', '6')
    path.setAttribute('style', 'filter:drop-shadow(0 2px 2px rgba(255,255,255,.9))')
    svg.append(path)
  })

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
    const numberLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    numberLabel.setAttribute('x', String(point.x))
    numberLabel.setAttribute('y', String(point.y + 3.5))
    numberLabel.setAttribute('fill', '#fff')
    numberLabel.setAttribute('font-family', 'system-ui, sans-serif')
    numberLabel.setAttribute('font-size', '10')
    numberLabel.setAttribute('font-weight', '700')
    numberLabel.setAttribute('text-anchor', 'middle')
    numberLabel.textContent = String(index + 1)

    const name = String(place.name || `路径点 ${index + 1}`).slice(0, 24)
    const labelWidth = Math.max(44, Math.min(150, name.length * 12 + 16))
    const placeNameBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    placeNameBackground.setAttribute('x', String(point.x + 14))
    placeNameBackground.setAttribute('y', String(point.y - 12))
    placeNameBackground.setAttribute('width', String(labelWidth))
    placeNameBackground.setAttribute('height', '24')
    placeNameBackground.setAttribute('rx', '8')
    placeNameBackground.setAttribute('fill', 'rgba(255,255,255,.92)')
    placeNameBackground.setAttribute('stroke', 'rgba(15,118,110,.22)')
    const placeName = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    placeName.setAttribute('x', String(point.x + 22))
    placeName.setAttribute('y', String(point.y + 4))
    placeName.setAttribute('fill', '#17324d')
    placeName.setAttribute('font-family', 'system-ui, sans-serif')
    placeName.setAttribute('font-size', '11')
    placeName.setAttribute('font-weight', '700')
    placeName.textContent = name
    svg.append(circle, numberLabel, placeNameBackground, placeName)
  })
  frame.prepend(svg)
}

const SNAPSHOT_SIZES = {
  '3:4': { width: 1080, height: 1440 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Static Map 图片加载失败。'))
    image.src = source
  })
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function snapshotPoint(point, camera, width, height, logicalWidth, logicalHeight) {
  const center = toWorldPoint(camera, camera.zoom)
  const world = toWorldPoint(point, camera.zoom)
  return {
    x: (logicalWidth / 2 + world.x - center.x) * width / logicalWidth,
    y: (logicalHeight / 2 + world.y - center.y) * height / logicalHeight,
  }
}

function drawSnapshotRoute(context, payload, camera, size, staticMap) {
  const segments = Array.isArray(payload.segments) && payload.segments.length
    ? payload.segments
    : [{ travelMode: 'walking', geometry: payload.geometry }]
  segments.forEach((segment) => {
    if (!Array.isArray(segment.geometry) || segment.geometry.length < 2) return
    context.beginPath()
    segment.geometry.forEach((point, index) => {
      const projected = snapshotPoint(point, camera, size.width, size.height, staticMap.logicalWidth, staticMap.logicalHeight)
      if (index === 0) context.moveTo(projected.x, projected.y)
      else context.lineTo(projected.x, projected.y)
    })
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 14
    context.strokeStyle = 'rgba(255,255,255,.92)'
    context.stroke()
    context.lineWidth = 8
    context.strokeStyle = segment.travelMode === 'driving' ? '#0f766e' : '#0284c7'
    context.setLineDash(segment.travelMode === 'driving' ? [] : [20, 12])
    context.stroke()
    context.setLineDash([])
  })
}

function drawSnapshotPlaces(context, payload, camera, size, staticMap) {
  context.font = '700 27px system-ui, sans-serif'
  payload.places.forEach((place, index) => {
    const point = snapshotPoint(place, camera, size.width, size.height, staticMap.logicalWidth, staticMap.logicalHeight)
    const name = String(place.name || `路径点 ${index + 1}`).slice(0, 28)
    const textWidth = Math.min(context.measureText(name).width, size.width * .46)
    const labelWidth = textWidth + 34
    const placeRight = point.x + 28 + labelWidth <= size.width - 28
    const labelX = placeRight ? point.x + 24 : point.x - 24 - labelWidth
    const labelY = Math.max(28, Math.min(size.height - 70, point.y - 25))

    context.fillStyle = 'rgba(255,255,255,.94)'
    context.strokeStyle = 'rgba(15,118,110,.24)'
    context.lineWidth = 2
    roundedRect(context, labelX, labelY, labelWidth, 50, 16)
    context.fill()
    context.stroke()
    context.fillStyle = '#17324d'
    context.textBaseline = 'middle'
    context.fillText(name, labelX + 17, labelY + 26, labelWidth - 34)

    context.beginPath()
    context.arc(point.x, point.y, 23, 0, Math.PI * 2)
    context.fillStyle = '#fb7185'
    context.fill()
    context.strokeStyle = '#fff'
    context.lineWidth = 7
    context.stroke()
    context.fillStyle = '#fff'
    context.font = '800 24px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(String(index + 1), point.x, point.y + 1)
    context.textAlign = 'start'
    context.font = '700 27px system-ui, sans-serif'
  })
}

function drawSnapshotChrome(context, payload, size) {
  const margin = 44
  context.fillStyle = 'rgba(255,255,255,.94)'
  roundedRect(context, margin, margin, size.width - margin * 2, 176, 30)
  context.fill()
  context.fillStyle = '#17324d'
  context.font = '800 52px system-ui, sans-serif'
  context.textBaseline = 'top'
  context.fillText(payload.title || '我的旅行路线', margin + 34, margin + 28, size.width - margin * 2 - 68)
  context.fillStyle = '#64748b'
  context.font = '600 27px system-ui, sans-serif'
  context.fillText(payload.subtitle || 'TripCanvas 路线快照', margin + 34, margin + 104, size.width - margin * 2 - 68)

  const footerHeight = 92
  // Keep the bottom strip clear so the Static Maps Google logo and legal
  // attribution remain visible in the exported image.
  const footerY = size.height - 88 - footerHeight
  context.fillStyle = 'rgba(255,255,255,.94)'
  roundedRect(context, margin, footerY, size.width - margin * 2, footerHeight, 26)
  context.fill()
  const distance = payload.routeSummary?.distanceMeters >= 1000
    ? `${(payload.routeSummary.distanceMeters / 1000).toFixed(1)} km`
    : `${payload.routeSummary?.distanceMeters ?? 0} m`
  const minutes = Math.max(1, Math.round((payload.routeSummary?.durationSeconds ?? 0) / 60))
  context.fillStyle = '#075985'
  context.font = '800 29px system-ui, sans-serif'
  context.textBaseline = 'middle'
  context.fillText(`${payload.places.length} 个地点 · ${distance} · 约 ${minutes} 分钟`, margin + 28, footerY + footerHeight / 2)
  context.textAlign = 'right'
  context.fillStyle = '#0f766e'
  context.font = '800 25px system-ui, sans-serif'
  context.fillText('旅图 TripCanvas', size.width - margin - 28, footerY + footerHeight / 2)
  context.textAlign = 'start'
}

function snapshotFilename() {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('')
  return `tripcanvas-${stamp}.png`
}

function playSnapshotEffect(frame) {
  const flash = document.createElement('div')
  Object.assign(flash.style, {
    background: '#fff',
    inset: '0',
    opacity: '0',
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: '10',
  })
  frame.append(flash)
  flash.animate([
    { opacity: 0 },
    { opacity: .96, offset: .28 },
    { opacity: 0 },
  ], { duration: 520, easing: 'ease-out' }).finished.finally(() => flash.remove())
  frame.animate([
    { transform: 'translate(-50%, -50%) scale(1)' },
    { transform: 'translate(-50%, -50%) scale(.975)', offset: .35 },
    { transform: 'translate(-50%, -50%) scale(1)' },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

async function createSnapshot(frame, payload, button) {
  if (!Array.isArray(payload.places) || payload.places.length < 2 || !payload.geometry?.length) {
    button.textContent = '请先生成路线'
    window.setTimeout(() => { button.textContent = '📸 快照' }, 1_800)
    return
  }
  const rawCamera = getMapCamera() ?? calculatePreviewCamera(payload)
  if (!rawCamera) return
  const camera = { ...rawCamera, zoom: Math.round(rawCamera.zoom) }
  button.disabled = true
  button.textContent = '生成中…'
  playSnapshotEffect(frame)
  try {
    const staticMap = await chrome.runtime.sendMessage({
      type: 'TRIPCANVAS_GET_STATIC_MAP',
      payload: { center: { lat: camera.lat, lng: camera.lng }, zoom: camera.zoom, canvasRatio: payload.canvasRatio },
    })
    if (!staticMap?.imageDataUrl) throw new Error(staticMap?.error || 'Static Map 生成失败。')
    const image = await loadImage(staticMap.imageDataUrl)
    const size = SNAPSHOT_SIZES[payload.canvasRatio] ?? SNAPSHOT_SIZES['3:4']
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法创建快照画布。')
    context.drawImage(image, 0, 0, size.width, size.height)
    drawSnapshotRoute(context, payload, camera, size, staticMap)
    drawSnapshotPlaces(context, payload, camera, size, staticMap)
    drawSnapshotChrome(context, payload, size)
    const result = await chrome.runtime.sendMessage({
      type: 'TRIPCANVAS_DOWNLOAD_SNAPSHOT',
      dataUrl: canvas.toDataURL('image/png', 1),
      filename: snapshotFilename(),
    })
    if (result?.error) throw new Error(result.error)
    button.textContent = '✓ 已保存'
  } catch (error) {
    button.textContent = '快照失败'
    button.title = error instanceof Error ? error.message : '快照失败。'
  } finally {
    window.setTimeout(() => {
      button.disabled = false
      button.textContent = '📸 快照'
    }, 1_800)
  }
}

function savePreviewPatch(patch) {
  chrome.runtime.sendMessage({ type: 'TRIPCANVAS_PREVIEW_PROJECT_PATCH', patch }).catch(() => undefined)
}

function renderPreview(payload) {
  lastPreviewPayload = payload
  document.getElementById(previewId)?.remove()
  if (!payload?.visible) return

  const ratios = { '3:4': '3 / 4', '4:5': '4 / 5', '9:16': '9 / 16' }
  const frame = document.createElement('aside')
  frame.id = previewId
  frame.setAttribute('aria-label', 'TripCanvas 图片预览与编辑框')
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
    pointerEvents: 'auto',
    zIndex: '2',
  })
  const ratioBar = document.createElement('div')
  Object.assign(ratioBar.style, { display: 'flex', gap: '5px', justifyContent: 'flex-end', marginBottom: '8px' })
  const snapshotButton = document.createElement('button')
  snapshotButton.type = 'button'
  snapshotButton.textContent = '📸 快照'
  snapshotButton.title = '导出极简 Static Map 路线图片'
  Object.assign(snapshotButton.style, {
    background: '#0f766e',
    border: '1px solid #0f766e',
    borderRadius: '999px',
    color: '#fff',
    cursor: 'pointer',
    font: '800 10px system-ui, sans-serif',
    marginRight: 'auto',
    padding: '4px 10px',
  })
  snapshotButton.addEventListener('click', () => void createSnapshot(frame, lastPreviewPayload, snapshotButton))
  ratioBar.append(snapshotButton)
  ;['3:4', '4:5', '9:16'].forEach((ratio) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = ratio
    button.setAttribute('aria-pressed', String(payload.canvasRatio === ratio))
    Object.assign(button.style, {
      border: payload.canvasRatio === ratio ? '1px solid #0284c7' : '1px solid #cbd5e1',
      borderRadius: '999px',
      color: payload.canvasRatio === ratio ? '#fff' : '#475569',
      cursor: 'pointer',
      font: '700 10px system-ui, sans-serif',
      padding: '4px 8px',
      background: payload.canvasRatio === ratio ? '#0284c7' : 'rgba(255,255,255,.82)',
    })
    button.addEventListener('click', () => {
      savePreviewPatch({ canvasRatio: ratio })
      renderPreview({ ...lastPreviewPayload, canvasRatio: ratio })
    })
    ratioBar.append(button)
  })

  const title = document.createElement('input')
  title.value = payload.title || ''
  title.placeholder = '输入主图标题'
  title.setAttribute('aria-label', '主图标题')
  Object.assign(title.style, {
    background: 'transparent',
    border: '0',
    borderBottom: '1px dashed rgba(2,132,199,.35)',
    boxSizing: 'border-box',
    color: '#17324d',
    display: 'block',
    font: '700 20px/1.25 system-ui, sans-serif',
    outline: 'none',
    padding: '2px 0 5px',
    width: '100%',
  })
  title.addEventListener('input', () => {
    lastPreviewPayload.title = title.value
    savePreviewPatch({ title: title.value })
  })

  const subtitle = document.createElement('input')
  subtitle.value = payload.subtitle || ''
  subtitle.placeholder = '输入副标题'
  subtitle.setAttribute('aria-label', '副标题')
  Object.assign(subtitle.style, {
    background: 'transparent',
    border: '0',
    boxSizing: 'border-box',
    color: '#475569',
    display: 'block',
    font: '500 12px/1.4 system-ui, sans-serif',
    marginTop: '5px',
    outline: 'none',
    padding: '2px 0',
    width: '100%',
  })
  subtitle.addEventListener('input', () => {
    lastPreviewPayload.subtitle = subtitle.value
    savePreviewPatch({ subtitle: subtitle.value })
  })
  heading.append(ratioBar, title, subtitle)

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
  if (message?.type === 'TRIPCANVAS_CALCULATE_PREVIEW_CAMERA') {
    sendResponse({ camera: calculatePreviewCamera(message.payload) })
  }
})
