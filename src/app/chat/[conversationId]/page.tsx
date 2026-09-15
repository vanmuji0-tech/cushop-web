'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { callCloud, getMe } from '@/lib/api'
import { formatPrice, showToast, copyText } from '@/lib/ui'
import { Avatar } from '@/components/GoodsCard'

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n)
const toMs = (t: any) => {
  if (!t) return 0
  const d = t instanceof Date ? t : new Date(t)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}
const TIME_SHOW_GAP = 2 * 60 * 1000
function clockText(t: any): string {
  if (!t) return ''
  const d = t instanceof Date ? t : new Date(t)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes())
  const sameYear = d.getFullYear() === now.getFullYear()
  const sameDay = sameYear && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) return hm
  const md = d.getMonth() + 1 + '-' + pad2(d.getDate())
  return (sameYear ? '' : d.getFullYear() + '-') + md + ' ' + hm
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="loading">加载中...</div>}>
      <ChatInner />
    </Suspense>
  )
}

function ChatInner() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const sp = useSearchParams()
  const toId = sp.get('toId') || ''
  const goodsId = sp.get('goodsId') || ''
  const sellerId = sp.get('sellerId') || ''
  const peerNameParam = sp.get('peerName') || ''

  const [me, setMe] = useState<any>(null)
  const [peerName, setPeerName] = useState(peerNameParam)
  const [peerAvatar, setPeerAvatar] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sendingImg, setSendingImg] = useState(false)
  const [reviewingDealId, setReviewingDealId] = useState('')
  const [reviewGrade, setReviewGrade] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [confirmingId, setConfirmingId] = useState('')

  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isSeller = !!me && me.id === sellerId

  const lockText = (m: any) => {
    if (m.type !== 'lock') return ''
    if (m.status === 'confirmed') return '已成交 ✅'
    if (m.status === 'cancelled') return '已取消'
    if (m.toId === me?.id) return '卖家想把这个商品锁定给你，确认后商品标记为「已卖出」'
    return '已发送锁定请求，等待买家确认'
  }

  const receiptText = (m: any, timeText: string) =>
    '【CUshop 成交凭证】\n商品：' + (m.goodsTitle || '') + '\n成交价：' + formatPrice(m.price) +
    '\n买家：' + (m.buyerName || '') + '\n卖家：' + (m.sellerName || '') +
    '\n成交时间：' + (timeText || '') + '\n请当面验货并保留此记录作为交易凭证。'

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!conversationId) return
      try {
        const res = await callCloud('message', { action: 'messageList', conversationId }, { silent })
        let prev = 0
        const list = (res.list || []).map((m: any) => {
          const t = toMs(m.createTime)
          const showTime = !prev || t - prev > TIME_SHOW_GAP
          if (t) prev = t
          const item = {
            ...m,
            lockText: lockText(m),
            showTime,
            timeText: showTime ? clockText(m.createTime) : '',
          }
          if (m.type === 'deal') {
            item.dealPriceText = formatPrice(m.price)
            item.receiptText = receiptText(m, clockText(m.createTime))
          }
          return item
        })
        setMessages(list)
        if (!silent && list.length) {
          setTimeout(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
          }, 50)
        }
      } catch (e) {
        console.error('[chat] 加载失败', e)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, me]
  )

  useEffect(() => {
    getMe().then(setMe)
    // 静默取对方最新头像昵称
    if (toId) {
      callCloud('user', { action: 'profile', userId: toId }, { silent: true })
        .then((res: any) => {
          const p = res?.profile
          if (!p) return
          setPeerAvatar(p.avatar || '')
          if (!peerName && p.nickname) setPeerName(p.nickname)
        })
        .catch(() => {})
    }
  }, [toId, peerName])

  useEffect(() => {
    loadMessages()
    const timer = setInterval(() => loadMessages(true), 3000)
    return () => clearInterval(timer)
  }, [loadMessages])

  async function sendMsg() {
    const content = input.trim()
    if (!content) return
    try {
      await callCloud('message', { action: 'send', conversationId, toId, content })
      setInput('')
      loadMessages()
    } catch (e) {
      console.error('[chat] 发送失败', e)
    }
  }

  async function sendImage(file: File) {
    if (sendingImg) return
    setSendingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const up = await upRes.json()
      if (up?.code !== 0) throw new Error(up?.msg || '上传失败')
      await callCloud('message', { action: 'send', conversationId, toId, type: 'image', content: up.data.url })
      loadMessages()
    } catch (e) {
      console.error('[chat] 发图失败', e)
    } finally {
      setSendingImg(false)
    }
  }

  async function sendLock() {
    try {
      await callCloud('message', { action: 'lock', conversationId, goodsId, toId })
      showToast('已发送锁定请求')
      loadMessages()
    } catch (e) {
      console.error('[chat] 锁定失败', e)
    }
  }

  async function confirmLock(id: string) {
    if (confirmingId) return
    setConfirmingId(id)
    try {
      await callCloud('message', { action: 'confirmLock', messageId: id })
      showToast('已成交')
      loadMessages()
    } catch (e) {
      console.error('[chat] 确认失败', e)
    } finally {
      setConfirmingId('')
    }
  }

  async function cancelLock(id: string) {
    try {
      await callCloud('message', { action: 'cancelLock', messageId: id })
      showToast('已取消')
      loadMessages()
    } catch (e) {
      console.error('[chat] 取消失败', e)
    }
  }

  async function submitReview() {
    if (!reviewGrade) return showToast('请选择评价')
    try {
      await callCloud('review', { action: 'submit', dealId: reviewingDealId, grade: reviewGrade, text: reviewText.trim() })
      showToast('评价成功')
      setReviewingDealId('')
      setReviewGrade('')
      setReviewText('')
    } catch (e) {
      console.error('[chat] 评价失败', e)
    }
  }

  return (
    <div className="chat">
      {/* 消息列表 */}
      <div className="msg-list" ref={listRef}>
        {messages.map((m) => (
          <div className="msg" key={m.id}>
            {m.showTime && <div className="msg-time">{m.timeText}</div>}

            {(m.type === 'text' || m.type === 'image') && (
              <div className={`msg-row ${m.fromId === me?.id ? 'me' : ''}`}>
                {m.fromId !== me?.id && <Avatar src={peerAvatar} name={peerName} size={34} />}
                {m.type === 'text' ? (
                  <div className="bubble">{m.content}</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="bubble-img" src={m.content} alt="" onClick={() => window.open(m.content, '_blank')} />
                )}
                {m.fromId === me?.id && <Avatar src={me?.avatar} name={me?.nickname} size={34} />}
              </div>
            )}

            {m.type === 'lock' && (
              <div className="lock-card">
                <div className="lock-icon">🔒</div>
                <div className="lock-text">{m.lockText}</div>
                {m.status === 'pending' && m.toId === me?.id && (
                  <div className="lock-actions">
                    <button className="lock-btn confirm" disabled={!!confirmingId} onClick={() => confirmLock(m.id)}>
                      {confirmingId === m.id ? '确认中…' : '确认成交'}
                    </button>
                    <button className="lock-btn cancel" disabled={!!confirmingId} onClick={() => cancelLock(m.id)}>取消</button>
                  </div>
                )}
              </div>
            )}

            {m.type === 'deal' && (
              <div className="deal-card">
                <div className="deal-title">🎉 成交凭证</div>
                <div className="deal-body">
                  {m.goodsImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="deal-img" src={m.goodsImage} alt="" />
                  )}
                  <div className="deal-info">
                    <div className="deal-name ellipsis-2">{m.goodsTitle}</div>
                    <div className="deal-price">{m.dealPriceText}</div>
                    <div className="deal-people">{m.buyerName} ⇄ {m.sellerName}</div>
                  </div>
                </div>
                <div className="deal-time">{m.timeText}</div>
                <div className="deal-tip">✓ 请当面验货，确认商品与描述一致</div>
                <div className="deal-tip">✓ 当面完成收付款，贵重物品约在公共场所</div>
                <div className="deal-actions">
                  <button className="deal-btn" onClick={async () => { const ok = await copyText(m.receiptText); showToast(ok ? '凭证已复制' : '复制失败') }}>复制凭证</button>
                  <button className="deal-btn primary" onClick={() => setReviewingDealId(m.dealId)}>评价本次交易</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 卖家锁定按钮 */}
      {isSeller && (
        <div className="lock-bar">
          <button className="lock-send nm-btn" onClick={sendLock}>🔒 锁定商品给买家</button>
        </div>
      )}

      {/* 输入栏 */}
      <div className="input-bar">
        <button className="img-btn" onClick={() => fileRef.current?.click()} disabled={sendingImg}>📷</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = '' }} />
        <input
          className="input nm-inset"
          placeholder="说点什么..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
        />
        <button className="send nm-btn-primary" onClick={sendMsg}>发送</button>
      </div>

      {/* 评价弹层 */}
      {reviewingDealId && (
        <div className="modal-mask" onClick={() => setReviewingDealId('')}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">评价本次交易</div>
            <div className="grade-row">
              {[
                { k: 'good', label: '靠谱' },
                { k: 'normal', label: '一般' },
                { k: 'bad', label: '踩雷' },
              ].map((g) => (
                <span key={g.k} className={`grade-item ${reviewGrade === g.k ? 'active' : ''}`} onClick={() => setReviewGrade(g.k)}>
                  {g.label}
                </span>
              ))}
            </div>
            <textarea className="nm-input review-textarea" placeholder="一句话评价（可选，50 字内）" maxLength={50} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
            <div className="modal-actions">
              <button className="nm-btn" onClick={() => setReviewingDealId('')}>取消</button>
              <button className="nm-btn-primary" onClick={submitReview}>提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
