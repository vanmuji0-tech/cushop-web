'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { callCloud, getMe } from '@/lib/api'
import { formatPrice, formatTime, TRADE_TEXT, showToast, copyText } from '@/lib/ui'
import { reportTarget } from '@/lib/report'
import { Avatar } from '@/components/GoodsCard'

// 商品详情：图片轮播 / 收藏 / 留言树 / 复制微信（照搬 pages/goods/detail）
// 私聊、举报、卖家主页属于后续部分，先占位提示。
export default function GoodsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [goods, setGoods] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [faved, setFaved] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [imgIdx, setImgIdx] = useState(0)

  const goLogin = () => {
    window.location.href = '/login?next=' + encodeURIComponent('/goods/' + id)
  }

  // 把留言组织成「一级留言 + 回复」树
  const organize = (list: any[]) => {
    const map: Record<string, any> = {}
    list.forEach((c) => {
      c.timeText = formatTime(c.createTime)
      c.replies = []
      map[c.id] = c
    })
    const roots: any[] = []
    list.forEach((c) => {
      if (c.parentId && map[c.parentId]) map[c.parentId].replies.push(c)
      else roots.push(c)
    })
    return roots
  }

  const loadDetail = useCallback(async () => {
    if (!id) return
    try {
      const g = await callCloud('goods', { action: 'detail', goodsId: id })
      setGoods({ ...g, priceText: formatPrice(g.price), timeText: formatTime(g.createTime), tradeTypeText: TRADE_TEXT[g.tradeType] || '自提' })
    } catch (e) {
      console.error('[detail] 加载失败', e)
    }
  }, [id])

  const loadComments = useCallback(async () => {
    try {
      const res = await callCloud('comment', { action: 'list', goodsId: id })
      setComments(organize(res.list || []))
    } catch (e) {
      console.error('[detail] 留言加载失败', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const checkFav = useCallback(async () => {
    const u = await getMe()
    setMe(u)
    if (!u) return
    try {
      const res = await callCloud('favorite', { action: 'check', goodsId: id })
      setFaved(res.faved)
    } catch (e) {
      console.error('[detail] 收藏状态获取失败', e)
    }
  }, [id])

  useEffect(() => {
    loadDetail()
    loadComments()
    checkFav()
  }, [loadDetail, loadComments, checkFav])

  async function onFav() {
    if (!me) return goLogin()
    try {
      const res = await callCloud('favorite', { action: 'toggle', goodsId: id })
      const delta = res.faved ? 1 : -1
      setFaved(res.faved)
      setGoods((g: any) => ({ ...g, favCount: Math.max(0, (g.favCount || 0) + delta) }))
      showToast(res.faved ? '已收藏' : '已取消收藏')
    } catch (e) {
      console.error('[detail] 收藏失败', e)
    }
  }

  async function onSubmitComment() {
    if (!me) return goLogin()
    const content = (commentInput || '').trim()
    if (!content) return showToast('请输入内容')
    try {
      await callCloud('comment', {
        action: 'create',
        goodsId: id,
        content,
        parentId: replyTo ? replyTo.id : '',
      })
      setCommentInput('')
      setReplyTo(null)
      setGoods((g: any) => ({ ...g, commentCount: (g.commentCount || 0) + 1 }))
      loadComments()
    } catch (e) {
      console.error('[detail] 留言失败', e)
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!window.confirm('确定删除这条留言吗？')) return
    try {
      await callCloud('comment', { action: 'delete', commentId })
      setGoods((g: any) => ({ ...g, commentCount: Math.max(0, (g.commentCount || 0) - 1) }))
      loadComments()
    } catch (e) {
      console.error('[detail] 删除失败', e)
    }
  }

  async function onContact() {
    if (!goods?.sellerWechat) return
    const ok = await copyText(goods.sellerWechat)
    showToast(ok ? '微信号已复制' : '复制失败，请手动记录：' + goods.sellerWechat)
  }

  async function onChat() {
    if (!me) return goLogin()
    try {
      const conv = await callCloud('message', { action: 'conversation', goodsId: id })
      const toId = conv.sellerId
      const peerName = conv.sellerName || ''
      router.push(`/chat/${conv.id}?toId=${encodeURIComponent(toId)}&goodsId=${encodeURIComponent(conv.goodsId)}&sellerId=${encodeURIComponent(conv.sellerId)}&peerName=${encodeURIComponent(peerName)}`)
    } catch (e) {
      console.error('[detail] 私聊失败', e)
    }
  }

  function goSellerHome() {
    router.push('/seller/' + goods.sellerId)
  }

  if (!goods) {
    return (
      <div className="detail">
        <div className="skeleton" style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 12 }} />
        <div className="head nm-card" style={{ marginTop: 12 }}>
          <div className="skeleton" style={{ height: 26, width: '40%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 18, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 18, width: '70%' }} />
        </div>
        <div className="section nm-card">
          <div className="skeleton" style={{ height: 14, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: '60%' }} />
        </div>
      </div>
    )
  }

  const isSeller = me?.id === goods.sellerId
  const images = goods.images || []

  return (
    <div className="detail">
      {/* 图片轮播 */}
      {images.length ? (
        <div className="carousel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="carousel-img" src={images[imgIdx]} alt={goods.title} />
          {images.length > 1 && (
            <>
              <button className="carousel-btn prev" onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}>‹</button>
              <button className="carousel-btn next" onClick={() => setImgIdx((i) => (i + 1) % images.length)}>›</button>
              <div className="carousel-dots">
                {images.map((_: any, i: number) => (
                  <span key={i} className={`carousel-dot ${i === imgIdx ? 'active' : ''}`} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="carousel-empty">🛍️</div>
      )}

      {/* 价格 + 收藏 */}
      <div className="head nm-card">
        <div className="price-row">
          <span className="price">{goods.priceText}</span>
          <div className="fav-btn nm-inset" onClick={onFav}>
            <span className={`fav-heart ${faved ? 'faved' : ''}`}>{faved ? '♥' : '♡'}</span>
            <span className="fav-num">{goods.favCount || 0}</span>
          </div>
        </div>
        <div className="title">{goods.title}</div>
        {goods.tags?.length ? (
          <div className="tags">
            {goods.tags.map((t: string) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        ) : null}
        <div className="views">👁 {goods.views} 次浏览 · {goods.timeText}</div>
      </div>

      {/* 描述 */}
      <div className="section nm-card">
        <div className="section-title">
          描述
          <span className="report-link" onClick={() => reportTarget('goods', goods.id)}>举报</span>
        </div>
        <div className="desc">{goods.desc || '卖家很懒，什么都没写 ~'}</div>
      </div>

      {/* 卖家信息 */}
      <div className="section nm-card">
        <div className="section-title">卖家信息</div>
        <div className="seller-row">
          <div onClick={goSellerHome} style={{ cursor: 'pointer' }}>
            <Avatar src={goods.sellerAvatar} name={goods.sellerName} size={40} />
          </div>
          <div className="seller-info">
            <div className="seller-name" onClick={goSellerHome} style={{ cursor: 'pointer' }}>{goods.sellerName}</div>
            <div className="seller-sub">交易方式：{goods.tradeTypeText}</div>
            {goods.sellerWechat ? <div className="seller-sub">微信号：{goods.sellerWechat}</div> : null}
          </div>
          {!isSeller && (
            <div className="seller-actions">
              <button className="chat-btn nm-btn-primary" onClick={onChat}>私聊</button>
              {goods.sellerWechat ? (
                <button className="contact-btn nm-btn" onClick={onContact}>复制微信</button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 留言区 */}
      <div className="section nm-card">
        <div className="section-title">留言（{goods.commentCount || 0}）</div>
        {comments.length ? (
          <div className="comment-list">
            {comments.map((c) => (
              <div className="comment-item" key={c.id}>
                <Avatar src={c.userAvatar} name={c.userName} size={32} />
                <div className="c-main">
                  <div className="c-name">{c.userName}</div>
                  <div className="c-content">{c.content}</div>
                  <div className="c-foot">
                    <span>{c.timeText}</span>
                    <span className="c-reply-btn" onClick={() => setReplyTo({ id: c.id, name: c.userName })}>回复</span>
                    {c.userId === me?.id ? (
                      <span className="c-del" onClick={() => onDeleteComment(c.id)}>删除</span>
                    ) : (
                      <span className="c-report" onClick={() => reportTarget('comment', c.id)}>举报</span>
                    )}
                  </div>
                  {c.replies?.length ? (
                    <div className="reply-list">
                      {c.replies.map((r: any) => (
                        <div className="reply-item" key={r.id}>
                          <span className="r-name">{r.userName}：</span>
                          <span>{r.content}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="comment-empty">还没有留言，来抢个沙发 ~</div>
        )}
      </div>

      {/* 留言输入栏 */}
      {replyTo && (
        <div className="reply-tip">
          <span>回复 @{replyTo.name}</span>
          <span className="reply-cancel" onClick={() => setReplyTo(null)}>×</span>
        </div>
      )}
      <div className="comment-bar">
        <input
          className="comment-input"
          placeholder={replyTo ? '回复 ' + replyTo.name : '说点什么...'}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmitComment()}
        />
        <button className="send-btn nm-btn-primary" onClick={onSubmitComment}>发送</button>
      </div>
    </div>
  )
}
