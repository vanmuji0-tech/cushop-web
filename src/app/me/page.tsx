'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMe, callCloud } from '@/lib/api'
import { showToast } from '@/lib/ui'
import { Avatar } from '@/components/GoodsCard'

// 我的：用户卡 + 菜单 + 登出（照搬 pages/mine/mine）
export default function MinePage() {
  const [me, setMe] = useState<any>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    getMe().then((u) => {
      setMe(u)
      if (u) {
        callCloud('message', { action: 'unreadTotal' }, { silent: true })
          .then((r: any) => setUnread(Number(r.total) || 0))
          .catch(() => {})
      }
    })
  }, [])

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const comingSoon = (tip?: string) => showToast((tip || '该功能') + '开发中')

  return (
    <div className="mine">
      {/* 用户卡片 */}
      <Link className="user-card nm-card" href="/me/profile">
        <Avatar src={me?.avatar} name={me?.nickname} size={52} />
        <div className="info">
          <div className="nickname">{me?.nickname || '点击登录'}</div>
          <div className="mine-desc">{me?.region || (me ? (me.role === 'admin' ? '管理员' : '点击编辑资料') : '登录后发布你的闲置好物')}</div>
        </div>
        <span className="arrow">›</span>
      </Link>

      {/* 菜单 */}
      <div className="menu nm-card">
        <Link className="menu-item" href="/messages">
          <span className="menu-icon">📨</span>
          <span className="menu-label">消息</span>
          {unread > 0 ? <span className="badge">{unread > 99 ? '99+' : unread}</span> : null}
          <span className="arrow">›</span>
        </Link>
        <Link className="menu-item" href="/me/my-goods">
          <span className="menu-icon">📦</span>
          <span className="menu-label">我的发布</span>
          <span className="arrow">›</span>
        </Link>
        <Link className="menu-item" href="/me/favorites">
          <span className="menu-icon">❤️</span>
          <span className="menu-label">我的收藏</span>
          <span className="arrow">›</span>
        </Link>
        <Link className="menu-item" href="/me/my-comments">
          <span className="menu-icon">💬</span>
          <span className="menu-label">我的留言</span>
          <span className="arrow">›</span>
        </Link>
      </div>

      <div className="menu nm-card">
        <Link className="menu-item" href="/me/profile">
          <span className="menu-icon">👤</span>
          <span className="menu-label">个人资料</span>
          <span className="arrow">›</span>
        </Link>
        <Link className="menu-item" href="/me/about">
          <span className="menu-icon">ℹ️</span>
          <span className="menu-label">关于 CUshop</span>
          <span className="arrow">›</span>
        </Link>
      </div>

      {me?.role === 'admin' && (
        <div className="menu nm-card">
          <Link className="menu-item" href="/admin">
            <span className="menu-icon">🛡️</span>
            <span className="menu-label">管理后台</span>
            <span className="arrow">›</span>
          </Link>
        </div>
      )}

      {me && (
        <button className="logout-btn nm-btn" onClick={onLogout}>
          退出登录
        </button>
      )}
    </div>
  )
}
