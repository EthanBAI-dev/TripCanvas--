chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'TRIPCANVAS_DELIVER_ROUTE') {
    window.postMessage(message.payload, window.location.origin)
    sendResponse({ ok: true })
    return
  }

  if (message?.type === 'TRIPCANVAS_SEARCH_PLACES') {
    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleResult)
      sendResponse({ error: 'Google Places 搜索超时。' })
    }, 15_000)

    function handleResult(event) {
      if (
        event.source !== window
        || event.origin !== window.location.origin
        || event.data?.type !== 'TRIPCANVAS_EXTENSION_SEARCH_RESULT'
        || event.data?.requestId !== requestId
      ) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleResult)
      sendResponse({ candidates: event.data.candidates ?? [], error: event.data.error })
    }

    window.addEventListener('message', handleResult)
    window.postMessage({
      type: 'TRIPCANVAS_EXTENSION_SEARCH_PLACES',
      requestId,
      query: message.query,
    }, window.location.origin)
    return true
  }
})
