import { useCallback, useEffect, useRef, useState } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<number[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])

    const timeoutId = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current = timersRef.current.filter(timerId => timerId !== timeoutId)
    }, 4000)

    timersRef.current.push(timeoutId)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timeoutId => window.clearTimeout(timeoutId))
      timersRef.current = []
    }
  }, [])

  return { toasts, addToast, removeToast }
}
