'use client'

import { useEffect, useState } from 'react'

// 全局 toast：监听 window 上的 'toast' 事件（callCloud / showToast 触发）
export default function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setMsg(detail?.title || '')
      setVisible(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), 2200)
    }
    window.addEventListener('toast', onToast)
    return () => {
      window.removeEventListener('toast', onToast)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!visible) return null
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.78)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: 20,
        fontSize: 14,
        maxWidth: '80vw',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {msg}
    </div>
  )
}
