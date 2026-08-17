import { useLayoutEffect, useRef, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 }

export function useElementSize<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null)
  const [size, setSize] = useState<ElementSize>(EMPTY_SIZE)

  useLayoutEffect(() => {
    const element = elementRef.current
    if (!element) {
      return undefined
    }

    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return [elementRef, size] as const
}
