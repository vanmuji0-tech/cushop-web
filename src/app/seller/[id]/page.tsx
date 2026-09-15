'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { callCloud, getMe } from '@/lib/api'
import { formatPrice, formatTime, showToast, copyText } from '@/lib/ui'
import { reportTarget } from '@/lib/report'
import { Avatar } from '@/components/GoodsCard'
import GoodsCard from '@/components/GoodsCard'

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
function shortDate(date: any): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 卖家主页（照搬 pages/seller/home）
export default function SellerHomePage() {
  const { id: sellerId } = useParams<{ id: string }>()
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [subText, setSubText] = useState('')
  const [goodsCount, setGoodsCount] = useState(0)
  const [goods, setGoods] = useState<any[]>([])
  const [badges, setBadges] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [quickChatting, setQuickChatting] = useState(false)

  const isSelf = !!me && me.id === sellerId

  const loadHome = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await callCloud('user', { action: 'home', sellerId })
      const p = res.profile || {}
      const joinDate = shortDate(p.createTime)
      const parts: string[] = []
      if (p.region) parts.push(p.region)
      if (joinDate) parts.push('加入 ' + joinDate)
      setProfile(p)
      setSubText(parts.join(' · ') || '')
      setGoodsCount(res.goodsCount || 0)
      setBadges(res.badges || null)
      setGoods((res.goods || []).map((g: any) => ({ ...g, priceText: formatPrice(g.price), timeText: formatTime(g.createTime) })))
      setLoading(false)
    } catch (e) {
      console.error('[seller home] 加载失败', e)
      setLoading(false)
      setFailed(true)
    }
  }, [sellerId])

  useEffect(() => {
    getMe().then(setMe)
    loadHome()
  }, [loadHome])

  async function onChat(goodsId: string) {
    if (!me) {
      router.push('/login?next=' + encodeURIComponent('/seller/' + sellerId))
      return
    }
    if (quickChatting) return
    setQuickChatting(true)
    try {
      const conv = await callCloud('message', { action: 'conversation', goodsId })
      const toId = conv.sellerId
      const peerName = (profile && profile.nickname) || conv.sellerName || ''
      router.push(`/chat/${conv.id}?toId=${encodeURIComponent(toId)}&goodsId=${encodeURIComponent(conv.goodsId)}&sellerId=${encodeURIComponent(conv.sellerId)}&peerName=${encodeURIComponent(peerName)}`)
    } catch (e) {
      console.error('[seller home] 私聊失败', e)
    } finally {
      setQuickChatting(false)
    }
  }

  async function onCopyWechat() {
    const w = profile?.wechat
    if (!w) return
    const ok = await copyText(w)
    showToast(ok ? '微信号已复制' : '复制失败，请手动记录：' + w)
  }

  if (loading) return <div className="loading">加载中...</div>

  if (failed) {
    return (
      <div className="empty">
        <div className="empty-icon">😕</div>
        <div className="empty-title">主页加载失败</div>
        <div className="empty-desc">这个人可能已注销，或网络出了点问题</div>
      </div>
    )
  }

  return (
    <div className="seller-home">
      {/* 卖家资料卡 */}
      <div className="profile nm-card">
        <Avatar src={profile?.avatar} name={profile?.nickname} size={56} />
        <div className="p-info">
          <div className="p-name ellipsis">{profile?.nickname || 'TA'}</div>
          <div className="p-sub ellipsis">{subText || '还没有填写资料'}</div>
          <div className="p-stat">{goodsCount} 件在售</div>
        </div>
        {profile?.wechat ? (
          <button className="p-copy nm-btn" onClick={onCopyWechat}>复制微信</button>
        ) : null}
      </div>

      {/* 信任徽章条 */}
      {badges && (
        <div className="badges nm-card">
          <div className="b-item">
            <span className="b-num">{badges.soldCount || 0}</span>
            <span className="b-label">已卖出</span>
          </div>
          <div className="b-item">
            <span className="b-num good">{badges.reviewGood || 0}</span>
            <span className="b-label">靠谱</span>
          </div>
          <div className="b-item">
            <span className="b-num normal">{badges.reviewNormal || 0}</span>
            <span className="b-label">一般</span>
          </div>
          <div className="b-item">
            <span className="b-num bad">{badges.reviewBad || 0}</span>
            <span className="b-label">踩雷</span>
          </div>
        </div>
      )}

      {/* 举报入口（第⑤部分接通） */}
      {!isSelf && (
        <div className="report-row">
          <span className="report-link" onClick={() => reportTarget('user', sellerId)}>⚠️ 举报 TA</span>
        </div>
      )}

      {/* 自己主页提示 */}
      {isSelf && (
        <div className="self-hint nm-inset">
          <span className="self-text">这是你自己的主页，点商品卡片可预览</span>
        </div>
      )}

      {/* 在售好物 */}
      <div className="wall-title">在售好物</div>

      {goods.length ? (
        <div className="list">
          {goods.map((g) => (
            <div key={g.id} style={{ position: 'relative', width: 'calc(50% - 6px)' }}>
              <GoodsCard item={g} />
              {!isSelf && (
                <button
                  className="chat-chip nm-btn-primary"
                  style={{ position: 'absolute', right: 8, bottom: 8 }}
                  onClick={() => onChat(g.id)}
                >
                  私聊
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">🛍️</div>
          <div className="empty-title">{isSelf ? '你还没有在售的商品' : 'TA 暂时没有在售的商品'}</div>
          <div className="empty-desc">{isSelf ? '去发布第一件闲置吧' : '去广场逛逛别的吧'}</div>
          {isSelf && <Link className="nm-btn empty-btn" href="/publish">去发布</Link>}
        </div>
      )}
    </div>
  )
}
