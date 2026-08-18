const storageKey = 'tripcanvas-extension-project'
const project = {
  title: '', subtitle: '', travelMode: 'walking', canvasRatio: '3:4', previewVisible: true,
  places: [], routeGeometry: [], routeSegments: [], routeSummary: null,
}

const byId = (id) => document.getElementById(id)
const status = byId('status')

function setStatus(message, isError = false) {
  status.textContent = message
  status.classList.toggle('error', isError)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character])
}

function saveProject() {
  chrome.storage.local.set({ [storageKey]: project })
}

async function getGoogleMapsTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (activeTab?.id && activeTab.url?.includes('google.com/maps')) return activeTab
  const tabs = await chrome.tabs.query({ url: ['https://www.google.com/maps/*', 'https://maps.google.com/*'] })
  return tabs[0]
}

async function getTripCanvasTab() {
  const tabs = await chrome.tabs.query({ url: ['http://127.0.0.1:5174/*', 'http://localhost:5174/*'] })
  return tabs[0]
}

function normalizeArrivalModes() {
  project.places.forEach((place, index) => {
    if (index === 0) {
      delete place.arrivalMode
    } else if (!['walking', 'driving'].includes(place.arrivalMode)) {
      place.arrivalMode = 'walking'
    }
  })
}

function getRouteModes() {
  return project.places.slice(1).map((place) => place.arrivalMode ?? 'walking')
}

async function waitForTabComplete(tabId, timeoutMs = 12_000) {
  const current = await chrome.tabs.get(tabId).catch(() => null)
  if (current?.status === 'complete') return

  await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(handleUpdate)
      resolve()
    }, timeoutMs)
    function handleUpdate(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return
      clearTimeout(timeoutId)
      chrome.tabs.onUpdated.removeListener(handleUpdate)
      resolve()
    }
    chrome.tabs.onUpdated.addListener(handleUpdate)
  })
}

async function fitGoogleMapsToPreview() {
  const mapTab = await getGoogleMapsTab()
  if (!mapTab?.id) return false

  const response = await chrome.tabs.sendMessage(mapTab.id, {
    type: 'TRIPCANVAS_CALCULATE_PREVIEW_CAMERA',
    payload: {
      canvasRatio: project.canvasRatio,
      places: project.places.map(({ lat, lng }) => ({ lat, lng })),
      geometry: project.routeGeometry,
    },
  }).catch(() => null)
  if (!response?.camera) return false

  const { lat, lng, zoom } = response.camera
  await chrome.tabs.update(mapTab.id, { url: `https://www.google.com/maps/@${lat},${lng},${zoom}z` })
  await waitForTabComplete(mapTab.id)
  return true
}

function renderCandidates(candidates) {
  const container = byId('place-candidates')
  container.replaceChildren()
  candidates.forEach((candidate) => {
    const item = document.createElement('div')
    item.className = 'candidate'
    item.innerHTML = `<div><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.address || '地址未提供')}</small></div><button type="button">添加</button>`
    item.querySelector('button').addEventListener('click', () => {
      if (project.places.some((place) => place.googlePlaceId === candidate.id)) {
        setStatus(`「${candidate.name}」已经在路线中。`, true)
        return
      }
      project.places.push({
        name: candidate.name,
        address: candidate.address,
        lat: candidate.lat,
        lng: candidate.lng,
        externalUrl: candidate.externalUrl,
        googlePlaceId: candidate.id,
        note: '',
        imageUrl: candidate.imageUrl || '',
        imageSourceUrl: candidate.imageSourceUrl,
        imageAttributions: candidate.imageAttributions,
        arrivalMode: 'walking',
      })
      normalizeArrivalModes()
      invalidateRoutePreview()
      saveProject()
      renderPlaces()
      void syncPreview()
      setStatus(`已加入精确地点「${candidate.name}」。`)
    })
    container.append(item)
  })
}

async function searchPlaces() {
  const query = byId('place-query').value.trim()
  if (!query) { setStatus('请输入要搜索的地点名称。', true); return }
  const tab = await getTripCanvasTab()
  if (!tab?.id) { setStatus('请先打开 TripCanvas（127.0.0.1:5174）。', true); return }

  const button = byId('search-place')
  button.disabled = true
  button.textContent = '搜索中'
  setStatus('正在通过 Google Places 查找候选地点…')
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRIPCANVAS_SEARCH_PLACES', query }).catch(() => null)
  button.disabled = false
  button.textContent = '搜索'

  if (!response || response.error) {
    renderCandidates([])
    setStatus(response?.error ?? '地点搜索失败，请刷新 TripCanvas 后重试。', true)
    return
  }
  renderCandidates(response.candidates ?? [])
  setStatus(response.candidates?.length ? `找到 ${response.candidates.length} 个候选，请选择。` : '没有找到匹配地点。', !response.candidates?.length)
}

async function syncPreview() {
  const tab = await getGoogleMapsTab()
  if (!tab?.id) return
  await chrome.tabs.sendMessage(tab.id, {
    type: 'TRIPCANVAS_PREVIEW_ROUTE',
    payload: {
      visible: project.previewVisible,
      title: project.title || '我的旅行路线',
      subtitle: project.subtitle,
      canvasRatio: project.canvasRatio,
      places: project.places.map(({ name, lat, lng }) => ({ name, lat, lng })),
      geometry: project.routeGeometry,
      segments: project.routeSegments,
      routeSummary: project.routeSummary,
    },
  }).catch(() => undefined)
}

function invalidateRoutePreview() {
  project.routeGeometry = []
  project.routeSegments = []
  project.routeSummary = null
  renderRouteSummary()
}

function renderRouteSummary() {
  const element = byId('route-summary')
  if (!project.routeSummary) {
    element.textContent = project.places.length >= 2 ? '路径点已变化，请更新真实路线预览。' : '添加两个路径点后可计算路线。'
    return
  }
  const distance = project.routeSummary.distanceMeters >= 1000
    ? `${(project.routeSummary.distanceMeters / 1000).toFixed(1)} km`
    : `${project.routeSummary.distanceMeters} m`
  const minutes = Math.max(1, Math.round(project.routeSummary.durationSeconds / 60))
  element.textContent = `${distance} · 约 ${minutes} 分钟${project.routeSummary.warning ? ' · 当前为回退预览' : ''}`
}

function updatePlace(index, field, value) {
  project.places[index][field] = ['lat', 'lng'].includes(field) ? Number(value) : value
  if (['lat', 'lng', 'arrivalMode'].includes(field)) invalidateRoutePreview()
  saveProject()
  void syncPreview()
}

function movePlace(fromIndex, toIndex) {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= project.places.length) return
  const [place] = project.places.splice(fromIndex, 1)
  project.places.splice(toIndex, 0, place)
  normalizeArrivalModes()
  invalidateRoutePreview()
  saveProject()
  renderPlaces()
  void syncPreview()
  setStatus(`已将「${place.name}」调整为第 ${toIndex + 1} 站。`)
}

function renderPlaces() {
  const container = byId('places')
  container.replaceChildren()
  project.places.forEach((place, index) => {
    const item = document.createElement('li')
    item.dataset.index = String(index)
    const arrivalEditor = index === 0
      ? '<div class="arrival-mode start">路线起点</div>'
      : `<label class="arrival-mode">前往此点<select data-field="arrivalMode" aria-label="前往 ${escapeHtml(place.name)} 的出行方式"><option value="walking" ${place.arrivalMode === 'walking' ? 'selected' : ''}>步行</option><option value="driving" ${place.arrivalMode === 'driving' ? 'selected' : ''}>驾车</option></select></label>`
    const arrivalSummary = index === 0 ? '起点' : place.arrivalMode === 'driving' ? '驾车到达' : '步行到达'
    item.innerHTML = `<div class="stop-order"><button class="drag-handle" draggable="true" aria-label="拖拽调整 ${escapeHtml(place.name)} 的顺序" title="拖拽排序">⠿</button><span>${index + 1}</span></div><details><summary><strong>${escapeHtml(place.name)}</strong><small>${arrivalSummary}</small></summary><div class="place-body">${arrivalEditor}<input data-field="name" value="${escapeHtml(place.name)}" aria-label="地点名称" placeholder="地点名称"/><div class="coords"><input data-field="lat" value="${place.lat}" aria-label="纬度" placeholder="纬度"/><input data-field="lng" value="${place.lng}" aria-label="经度" placeholder="经度"/></div><div class="place-details"><textarea data-field="note" aria-label="地点说明" placeholder="攻略、停留时间或拍照提示">${escapeHtml(place.note)}</textarea><input data-field="imageUrl" value="${escapeHtml(place.imageUrl)}" aria-label="地点图片链接" placeholder="图片 URL（用于副图）"/></div></div></details><div class="stop-actions"><button class="move-up" aria-label="上移 ${escapeHtml(place.name)}" title="上移" ${index === 0 ? 'disabled' : ''}>↑</button><button class="move-down" aria-label="下移 ${escapeHtml(place.name)}" title="下移" ${index === project.places.length - 1 ? 'disabled' : ''}>↓</button><button class="remove" aria-label="删除 ${escapeHtml(place.name)}" title="删除">×</button></div>`
    item.querySelectorAll('input, textarea, select').forEach((input) => input.addEventListener('input', () => {
      updatePlace(index, input.dataset.field, input.value)
      if (input.dataset.field === 'name') item.querySelector('summary strong').textContent = input.value || '未命名地点'
      if (input.dataset.field === 'arrivalMode') item.querySelector('summary small').textContent = input.value === 'driving' ? '驾车到达' : '步行到达'
    }))
    item.querySelector('.remove').addEventListener('click', () => {
      project.places.splice(index, 1)
      normalizeArrivalModes()
      invalidateRoutePreview()
      saveProject()
      renderPlaces()
      void syncPreview()
    })
    item.querySelector('.move-up').addEventListener('click', () => movePlace(index, index - 1))
    item.querySelector('.move-down').addEventListener('click', () => movePlace(index, index + 1))
    const dragHandle = item.querySelector('.drag-handle')
    dragHandle.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
      item.classList.add('dragging')
    })
    dragHandle.addEventListener('dragend', () => {
      item.classList.remove('dragging')
      container.querySelectorAll('.drag-over').forEach((candidate) => candidate.classList.remove('drag-over'))
    })
    item.addEventListener('dragover', (event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      item.classList.add('drag-over')
    })
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'))
    item.addEventListener('drop', (event) => {
      event.preventDefault()
      const fromIndex = Number(event.dataTransfer.getData('text/plain'))
      item.classList.remove('drag-over')
      if (Number.isInteger(fromIndex)) movePlace(fromIndex, index)
    })
    container.append(item)
  })
}

function bindProjectField(id, field) {
  const element = byId(id)
  element.value = project[field]
  element.addEventListener('input', () => {
    project[field] = element.value
    if (field === 'travelMode') invalidateRoutePreview()
    saveProject()
    void syncPreview()
  })
}

byId('capture').addEventListener('click', async () => {
  const tab = await getGoogleMapsTab()
  if (!tab?.id) { setStatus('请先打开 Google Maps 地点详情页面。', true); return }
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRIPCANVAS_CAPTURE_GOOGLE_PLACE' }).catch(() => null)
  if (!response?.place) { setStatus(response?.error ?? '无法捕获该地点，请刷新 Google Maps 后重试。', true); return }
  project.places.push({ ...response.place, note: '', imageUrl: '' })
  project.places.at(-1).arrivalMode = 'walking'
  normalizeArrivalModes()
  invalidateRoutePreview()
  saveProject(); renderPlaces(); await syncPreview(); setStatus(`已加入「${response.place.name}」。`)
})

byId('search-place').addEventListener('click', () => void searchPlaces())
byId('place-query').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') void searchPlaces()
})

byId('clear').addEventListener('click', () => {
  project.places = []; invalidateRoutePreview(); saveProject(); renderPlaces(); void syncPreview(); setStatus('已清空路径点。')
})

byId('update-route-preview').addEventListener('click', async () => {
  if (project.places.length < 2) { setStatus('请至少添加 2 个路径点。', true); return }
  const target = await getTripCanvasTab()
  if (!target?.id) { setStatus('请先打开 TripCanvas（127.0.0.1:5174）。', true); return }

  const button = byId('update-route-preview')
  button.disabled = true
  button.textContent = '正在计算路线…'
  const response = await chrome.tabs.sendMessage(target.id, {
    type: 'TRIPCANVAS_CALCULATE_PREVIEW_ROUTE',
    travelMode: getRouteModes()[0] ?? 'walking',
    places: project.places.map(({ name, lat, lng, arrivalMode }) => ({ name, lat, lng, arrivalMode })),
  }).catch(() => null)
  button.disabled = false
  button.textContent = '更新真实路线预览'

  if (!response?.geometry?.length) {
    setStatus(response?.error ?? '路线预览计算失败。', true)
    return
  }
  project.routeGeometry = response.geometry
  project.routeSegments = response.segments ?? []
  project.routeSummary = {
    distanceMeters: response.distanceMeters ?? 0,
    durationSeconds: response.durationSeconds ?? 0,
    warning: response.warning,
  }
  saveProject()
  renderRouteSummary()
  setStatus('路线已计算，正在根据预览框自动缩放和平移地图…')
  const fittedMap = await fitGoogleMapsToPreview()
  await syncPreview()
  if (!fittedMap) {
    setStatus('路线已计算，但无法读取 Google Maps 预览框尺寸。', true)
    return
  }
  setStatus(response.warning ? `路线已适配画幅。${response.warning}` : '地图已自动缩放和平移，全部路径点已适配预览框。')
})

byId('toggle-preview').addEventListener('click', () => {
  project.previewVisible = !project.previewVisible
  byId('toggle-preview').textContent = project.previewVisible ? '隐藏地图预览框' : '显示地图预览框'
  saveProject(); void syncPreview()
})

byId('ai-plan').addEventListener('click', async () => {
  const prompt = byId('ai-prompt').value.trim()
  if (prompt.length < 4) { setStatus('请先写下路线想法。', true); return }
  const target = await getTripCanvasTab()
  if (!target?.id) { setStatus('请先打开 TripCanvas（127.0.0.1:5174）。', true); return }

  const button = byId('ai-plan')
  button.disabled = true
  button.textContent = 'AI 正在规划并核对地点…'
  setStatus('AI 正在生成站点与简洁说明，随后会调用 Google Places 和 Routes。')
  const response = await chrome.tabs.sendMessage(target.id, {
    type: 'TRIPCANVAS_PLAN_AI_ROUTE',
    prompt,
  }).catch(() => null)
  button.disabled = false
  button.textContent = '规划为路径点'

  if (!response?.plan) {
    setStatus(response?.error ?? 'AI 路线规划失败。', true)
    return
  }
  const plan = response.plan
  project.title = plan.title
  project.subtitle = plan.subtitle || ''
  project.canvasRatio = plan.canvasRatio || project.canvasRatio
  project.places = plan.places.map((place) => ({
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    externalUrl: place.externalUrl,
    googlePlaceId: place.id,
    note: place.note,
    imageUrl: place.imageUrl || '',
    imageSourceUrl: place.imageSourceUrl,
    imageAttributions: place.imageAttributions,
    arrivalMode: place.arrivalMode,
    category: place.category,
  }))
  project.routeGeometry = plan.geometry
  project.routeSegments = plan.segments || []
  project.routeSummary = {
    distanceMeters: plan.distanceMeters || 0,
    durationSeconds: plan.durationSeconds || 0,
    warning: plan.warning,
  }
  normalizeArrivalModes()
  saveProject()
  renderPlaces()
  renderRouteSummary()
  setStatus('AI 路线和 Google 真实地点已生成，正在适配地图画幅…')
  await fitGoogleMapsToPreview()
  await syncPreview()
  setStatus(plan.warning ? `规划完成。${plan.warning}` : `规划完成：${project.places.length} 个真实路径点。`)
})

byId('send').addEventListener('click', async () => {
  if (project.places.length < 2) { setStatus('请至少添加 2 个路径点。', true); return }
  if (project.places.some((place) => !place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) {
    setStatus('请补全每个地点的名称和有效坐标。', true); return
  }
  const target = await getTripCanvasTab()
  if (!target?.id) { setStatus('请先打开 TripCanvas（127.0.0.1:5174）。', true); return }
  const payload = { type: 'TRIPCANVAS_IMPORT_ROUTE', payload: {
    title: project.title.trim() || undefined,
    subtitle: project.subtitle.trim() || undefined,
    canvasRatio: project.canvasRatio,
    travelMode: getRouteModes()[0] ?? 'walking',
    places: project.places.map((place) => ({
      ...place,
      imageUrl: place.imageUrl?.trim() || undefined,
      note: place.note?.trim() || undefined,
    })),
  } }
  const response = await chrome.tabs.sendMessage(target.id, { type: 'TRIPCANVAS_DELIVER_ROUTE', payload }).catch(() => null)
  if (!response?.ok) { setStatus('发送失败，请刷新 TripCanvas 页面后重试。', true); return }
  setStatus(`已生成 1 张路线主图和 ${project.places.length} 张地点副图。`)
})

chrome.storage.local.get({ [storageKey]: null }, (result) => {
  Object.assign(project, result[storageKey] ?? {})
  project.places = Array.isArray(project.places) ? project.places : []
  project.routeGeometry = Array.isArray(project.routeGeometry) ? project.routeGeometry : []
  project.routeSegments = Array.isArray(project.routeSegments) ? project.routeSegments : []
  normalizeArrivalModes()
  byId('toggle-preview').textContent = project.previewVisible ? '隐藏地图预览框' : '显示地图预览框'
  renderPlaces()
  renderRouteSummary()
  void syncPreview()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'TRIPCANVAS_PREVIEW_PROJECT_PATCH' || typeof message.patch !== 'object') return
  const patch = message.patch
  if (typeof patch.title === 'string') project.title = patch.title.slice(0, 120)
  if (typeof patch.subtitle === 'string') project.subtitle = patch.subtitle.slice(0, 180)
  const ratioChanged = ['3:4', '4:5', '9:16'].includes(patch.canvasRatio) && patch.canvasRatio !== project.canvasRatio
  if (['3:4', '4:5', '9:16'].includes(patch.canvasRatio)) project.canvasRatio = patch.canvasRatio
  saveProject()
  sendResponse({ ok: true })
  if (ratioChanged && project.routeGeometry.length) {
    window.setTimeout(() => {
      void fitGoogleMapsToPreview().then(() => syncPreview())
    }, 100)
  }
})
