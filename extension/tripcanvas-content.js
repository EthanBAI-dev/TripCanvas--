chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'TRIPCANVAS_DELIVER_ROUTE') return
  window.postMessage(message.payload, window.location.origin)
  sendResponse({ ok: true })
})
