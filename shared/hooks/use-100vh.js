import {useEffect, useState} from 'react'

export function use100vh() {
  const [height] = useState(measureHeight)

  const wasRenderedOnClientAtLeastOnce = useWasRenderedOnClientAtLeastOnce()

  return wasRenderedOnClientAtLeastOnce ? height : null
}

export function measureHeight() {
  if (!isClient()) return null
  return window.innerHeight
}

function useWasRenderedOnClientAtLeastOnce() {
  const [
    wasRenderedOnClientAtLeastOnce,
    setWasRenderedOnClientAtLeastOnce,
  ] = useState(false)

  useEffect(() => {
    if (isClient()) {
      setWasRenderedOnClientAtLeastOnce(true)
    }
  }, [])
  return wasRenderedOnClientAtLeastOnce
}

function isClient() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}
