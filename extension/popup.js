const storageKey = 'tripcanvas-extension-project'
const project = {
  title: '', subtitle: '', travelMode: 'walking', canvasRatio: '3:4', previewVisible: true, places: [],
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
      places: project.places.map(({ name }) => ({ name })),
    },
  }).catch(() => undefined)
}

function updatePlace(index, field, value) {
  project.places[index][field] = ['lat', 'lng'].includes(field) ? Number(value) : value
  saveProject()
  void syncPreview()
}

function renderPlaces() {
  const container = byId('places')
  container.replaceChildren()
  project.places.forEach((place, index) => {
    const item = document.createElement('li')
    item.innerHTML = `<span>${index + 1}</span><div><input data-field="name" value="${escapeHtml(place.name)}" aria-label="地点名称" placeholder="地点名称"/><div class="coords"><input data-field="lat" value="${place.lat}" aria-label="纬度" placeholder="纬度"/><input data-field="lng" value="${place.lng}" aria-label="经度" placeholder="经度"/></div><div class="place-details"><textarea data-field="note" aria-label="地点说明" placeholder="攻略、停留时间或拍照提示">${escapeHtml(place.note)}</textarea><input data-field="imageUrl" value="${escapeHtml(place.imageUrl)}" aria-label="地点图片链接" placeholder="图片 URL（用于副图）"/></div></div><button class="remove" aria-label="删除 ${escapeHtml(place.name)}">×</button>`
    item.querySelectorAll('input, textarea').forEach((input) => input.addEventListener('input', () => {
      updatePlace(index, input.dataset.field, input.value)
    }))
    item.querySelector('.remove').addEventListener('click', () => {
      project.places.splice(index, 1)
      saveProject()
      renderPlaces()
      void syncPreview()
    })
    container.append(item)
  })
}

function bindProjectField(id, field) {
  const element = byId(id)
  element.value = project[field]
  element.addEventListener('input', () => {
    project[field] = element.value
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
  saveProject(); renderPlaces(); await syncPreview(); setStatus(`已加入「${response.place.name}」。`)
})

byId('clear').addEventListener('click', () => {
  project.places = []; saveProject(); renderPlaces(); void syncPreview(); setStatus('已清空路径点。')
})

byId('toggle-preview').addEventListener('click', () => {
  project.previewVisible = !project.previewVisible
  byId('toggle-preview').textContent = project.previewVisible ? '隐藏地图预览框' : '显示地图预览框'
  saveProject(); void syncPreview()
})

byId('ai-plan').addEventListener('click', () => {
  setStatus('AI 规划接口将在下一阶段接入；它会直接修改下面的路径点，不会生成另一份路线。')
})

byId('send').addEventListener('click', async () => {
  if (project.places.length < 2) { setStatus('请至少添加 2 个路径点。', true); return }
  if (project.places.some((place) => !place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) {
    setStatus('请补全每个地点的名称和有效坐标。', true); return
  }
  const targets = await chrome.tabs.query({ url: ['http://127.0.0.1:5174/*', 'http://localhost:5174/*'] })
  if (!targets[0]?.id) { setStatus('请先打开 TripCanvas（127.0.0.1:5174）。', true); return }
  const payload = { type: 'TRIPCANVAS_IMPORT_ROUTE', payload: {
    title: project.title.trim() || undefined,
    subtitle: project.subtitle.trim() || undefined,
    canvasRatio: project.canvasRatio,
    travelMode: project.travelMode,
    places: project.places.map((place) => ({
      ...place,
      imageUrl: place.imageUrl?.trim() || undefined,
      note: place.note?.trim() || undefined,
    })),
  } }
  const response = await chrome.tabs.sendMessage(targets[0].id, { type: 'TRIPCANVAS_DELIVER_ROUTE', payload }).catch(() => null)
  if (!response?.ok) { setStatus('发送失败，请刷新 TripCanvas 页面后重试。', true); return }
  setStatus(`已生成 1 张路线主图和 ${project.places.length} 张地点副图。`)
})

chrome.storage.local.get({ [storageKey]: null }, (result) => {
  Object.assign(project, result[storageKey] ?? {})
  project.places = Array.isArray(project.places) ? project.places : []
  bindProjectField('title', 'title')
  bindProjectField('subtitle', 'subtitle')
  bindProjectField('travel-mode', 'travelMode')
  bindProjectField('canvas-ratio', 'canvasRatio')
  byId('toggle-preview').textContent = project.previewVisible ? '隐藏地图预览框' : '显示地图预览框'
  renderPlaces()
  void syncPreview()
})
