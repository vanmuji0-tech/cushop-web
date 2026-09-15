'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { callCloud } from '@/lib/api'
import { formatTime } from '@/lib/ui'

// 我的留言：收到的 / 发出的（照搬 pages/mine/my-comments）
export default function MyCommentsPage() {
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [received, setReceived] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const data = await callCloud('comment', { action: 'mine' })
      setReceived((data.received || []).map((c: any) => ({ ...c, timeText: formatTime(c.createTime) })))
      setSent((data.sent || []).map((c: any) => ({ ...c, timeText: formatTime(c.createTime) })))
    } catch (e) {
      console.error('[my-comments] 加载失败', e)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const current = tab === 'received' ? received : sent

  return (
    <div className="sub-page">
      <div className="tab-bar">
        <span className={`tab-item ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
          收到的留言
        </span>
        <span className={`tab-item ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          发出的留言
        </span>
      </div>

      {current.length ? (
        <div>
          {current.map((c) => (
            <Link key={c.id} href={`/goods/${c.goodsId}`} className="nm-card" style={{ display: 'block', padding: 14, marginBottom: 12 }}>
              <div className="comment-row-title ellipsis">{c.goodsTitle || '商品'}</div>
              <div className="comment-row-content">{c.content}</div>
              <div className="comment-row-title" style={{ marginTop: 6 }}>
                {tab === 'received' ? `${c.userName} · ` : ''}{c.timeText}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">{tab === 'received' ? '📭' : '💬'}</div>
          <div className="empty-title">{tab === 'received' ? '还没有收到留言' : '你还没留过言'}</div>
        </div>
      )}
    </div>
  )
}
