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

  if (message?.type === 'TRIPCANVAS_PLAN_AI_ROUTE') {
    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleAiResult)
      sendResponse({ error: 'AI 规划、地点确认或路线计算超时。' })
    }, 60_000)

    function handleAiResult(event) {
      if (
        event.source !== window
        || event.origin !== window.location.origin
        || event.data?.type !== 'TRIPCANVAS_EXTENSION_AI_ROUTE_RESULT'
        || event.data?.requestId !== requestId
      ) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleAiResult)
      sendResponse({ plan: event.data.plan, error: event.data.error })
    }

    window.addEventListener('message', handleAiResult)
    window.postMessage({
      type: 'TRIPCANVAS_EXTENSION_PLAN_AI_ROUTE',
      requestId,
      prompt: message.prompt,
    }, window.location.origin)
    return true
  }

  if (message?.type === 'TRIPCANVAS_CALCULATE_PREVIEW_ROUTE') {
    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleRouteResult)
      sendResponse({ error: 'Google Routes 预览请求超时。' })
    }, 20_000)

    function handleRouteResult(event) {
      if (
        event.source !== window
        || event.origin !== window.location.origin
        || event.data?.type !== 'TRIPCANVAS_EXTENSION_ROUTE_RESULT'
        || event.data?.requestId !== requestId
      ) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleRouteResult)
      sendResponse(event.data)
    }

    window.addEventListener('message', handleRouteResult)
    window.postMessage({
      type: 'TRIPCANVAS_EXTENSION_CALCULATE_ROUTE',
      requestId,
      travelMode: message.travelMode,
      places: message.places,
    }, window.location.origin)
    return true
  }
})
