'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 导航：移动端底部 tabBar，桌面 ≥900px 顶部导航（照搬小程序 tabBar 四栏）
const TABS = [
  { path: '/', label: '广场', icon: '🛍️' },
  { path: '/community', label: '社群', icon: '💬' },
  { path: '/publish', label: '发布', icon: '＋' },
  { path: '/me', label: '我的', icon: '👤' },
]

export default function Navbar() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))

  return (
    <>
      {/* 顶部导航（桌面） */}
      <header className="desktop-nav">
        <Link href="/" className="brand">🛍️ CUshop</Link>
        <nav>
          {TABS.map((t) => (
            <Link key={t.path} href={t.path} className={isActive(t.path) ? 'active' : ''}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* 底部 tab（移动端） */}
      <nav className="mobile-tab">
        {TABS.map((t) => (
          <Link key={t.path} href={t.path} className={isActive(t.path) ? 'active' : ''}>
            <span className="icon">{t.icon}</span>
            <span className="label">{t.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
