chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined)

const apiBaseUrl = 'http://127.0.0.1:5174'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRIPCANVAS_GET_STATIC_MAP') {
    void fetch(`${apiBaseUrl}/api/google/static-map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload),
      signal: AbortSignal.timeout(30_000),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || `Static Map 请求失败（${response.status}）。`)
        sendResponse(payload)
      })
      .catch((error) => sendResponse({
        error: error instanceof Error ? error.message : 'Static Map 请求失败。',
      }))
    return true
  }

  if (message?.type === 'TRIPCANVAS_DOWNLOAD_SNAPSHOT') {
    const filename = typeof message.filename === 'string'
      ? message.filename.replace(/[^\w\-.\u4e00-\u9fff]/g, '-')
      : 'tripcanvas-snapshot.png'
    void chrome.downloads.download({
      url: message.dataUrl,
      filename,
      saveAs: false,
    }).then((downloadId) => sendResponse({ downloadId }))
      .catch((error) => sendResponse({
        error: error instanceof Error ? error.message : '快照下载失败。',
      }))
    return true
  }
})
