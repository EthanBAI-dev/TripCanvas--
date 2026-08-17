const storageKey = 'tripcanvas-extension-places'
let places = []

const byId = (id) => document.getElementById(id)
const status = byId('status')

function setStatus(message, isError = false) {
  status.textContent = message
  status.classList.toggle('error', isError)
}

function savePlaces() {
  chrome.storage.local.set({ [storageKey]: places })
}

function renderPlaces() {
  const container = byId('places')
  container.replaceChildren()
  places.forEach((place, index) => {
    const item = document.createElement('li')
    item.innerHTML = `<span>${index + 1}</span><div><input data-field="name" value="${escapeHtml(place.name)}" aria-label="地点名称"/><div class="coords"><input data-field="lat" value="${place.lat}" aria-label="纬度"/><input data-field="lng" value="${place.lng}" aria-label="经度"/></div></div><button class="remove" aria-label="删除 ${escapeHtml(place.name)}">×</button>`
    item.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => {
      const field = input.dataset.field
      places[index][field] = field === 'name' ? input.value : Number(input.value)
      savePlaces()
    }))
    item.querySelector('.remove').addEventListener('click', () => {
      places.splice(index, 1); savePlaces(); renderPlaces()
    })
    container.append(item)
  })
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

byId('capture').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url?.includes('google.com/maps')) {
    setStatus('请先切换到 Google Maps 的地点详情页面。', true); return
  }
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRIPCANVAS_CAPTURE_GOOGLE_PLACE' }).catch(() => null)
  if (!response?.place) { setStatus(response?.error ?? '无法捕获该地点，请刷新 Google Maps 后重试。', true); return }
  places.push(response.place); savePlaces(); renderPlaces(); setStatus(`已加入「${response.place.name}」，请核对坐标。`)
})

byId('clear').addEventListener('click', () => { places = []; savePlaces(); renderPlaces(); setStatus('已清空地点。') })

byId('send').addEventListener('click', async () => {
  if (places.length < 2) { setStatus('请至少捕获 2 个地点。', true); return }
  if (places.some((place) => !place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) { setStatus('请补全每个地点的名称和有效坐标。', true); return }
  const targets = await chrome.tabs.query({ url: ['http://127.0.0.1:5174/*', 'http://localhost:5174/*'] })
  if (!targets[0]?.id) { setStatus('请先在浏览器打开 TripCanvas（127.0.0.1:5174）。', true); return }
  const payload = { type: 'TRIPCANVAS_IMPORT_ROUTE', payload: { title: byId('title').value.trim() || undefined, travelMode: byId('travel-mode').value, places } }
  const response = await chrome.tabs.sendMessage(targets[0].id, { type: 'TRIPCANVAS_DELIVER_ROUTE', payload }).catch(() => null)
  if (!response?.ok) { setStatus('发送失败，请刷新 TripCanvas 页面后重试。', true); return }
  setStatus(`已发送 ${places.length} 个地点到 TripCanvas。`)
})

chrome.storage.local.get({ [storageKey]: [] }, (result) => { places = result[storageKey]; renderPlaces() })
