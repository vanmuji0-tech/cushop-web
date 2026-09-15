'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { callCloud } from '@/lib/api'
import { formatTime } from '@/lib/ui'
import { Avatar } from '@/components/GoodsCard'

// 会话列表（照搬 pages/mine/conversations）
export default function MessagesPage() {
  const [list, setList] = useState<any[]>([])

  const loadList = useCallback(async () => {
    try {
      const res = await callCloud('message', { action: 'conversationList' })
      setList(
        (res.list || []).map((c: any) => ({
          ...c,
          timeText: formatTime(c.lastMsgTime),
          unread: Number(c.unread) || 0,
        }))
      )
    } catch (e) {
      console.error('[messages] 加载失败', e)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  return (
    <div className="sub-page">
      <div className="sub-header">
        <span className="sub-title">消息</span>
      </div>

      {list.length ? (
        <div>
          {list.map((c) => {
            const toId = c.peerId || (c.buyerId === undefined ? c.sellerId : '')
            const peerName = c.peerName || '聊天'
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}?toId=${encodeURIComponent(toId)}&goodsId=${encodeURIComponent(c.goodsId || '')}&sellerId=${encodeURIComponent(c.sellerId || '')}&peerName=${encodeURIComponent(peerName)}`}
                className="nm-card conv-row"
              >
                <Avatar src={c.peerAvatar} name={peerName} size={44} />
                <div className="conv-info">
                  <div className="conv-peer ellipsis">{peerName}</div>
                  {c.goodsTitle ? <div className="conv-goods ellipsis">📦 {c.goodsTitle}</div> : null}
                  <div className="conv-last ellipsis">{c.lastMsg || '开始聊聊吧'}</div>
                </div>
                <div className="conv-right">
                  <div className="conv-time">{c.timeText}</div>
                  {c.unread > 0 ? <div className="badge">{c.unread > 99 ? '99+' : c.unread}</div> : null}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">💬</div>
          <div className="empty-title">暂无消息</div>
          <div className="empty-desc">去逛逛，私聊感兴趣的卖家吧</div>
        </div>
      )}
    </div>
  )
}
