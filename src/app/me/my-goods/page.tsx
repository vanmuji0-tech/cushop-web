'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { callCloud } from '@/lib/api'
import { formatPrice, formatTime, showToast } from '@/lib/ui'

const STATUS_TEXT: Record<string, string> = { on: '在售', sold: '已卖出', off: '已下架', removed: '已删除' }

// 我的发布：列表 + 上下架/标记卖出/删除（照搬 pages/mine/my-goods）
export default function MyGoodsPage() {
  const [list, setList] = useState<any[]>([])

  const loadList = useCallback(async () => {
    try {
      const res = await callCloud('goods', { action: 'myList' })
      setList(
        (res.list || []).map((g: any) => ({
          ...g,
          priceText: formatPrice(g.price),
          timeText: formatTime(g.createTime),
          statusText: STATUS_TEXT[g.status] || g.status,
        }))
      )
    } catch (e) {
      console.error('[my-goods] 加载失败', e)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function setStatus(goodsId: string, status: string) {
    try {
      await callCloud('goods', { action: 'update', goodsId, status })
      showToast('操作成功')
      loadList()
    } catch (e) {
      console.error('[my-goods] 状态更新失败', e)
    }
  }

  async function onDelete(goodsId: string) {
    if (!window.confirm('确定删除这个商品吗？删除后不可恢复')) return
    try {
      await callCloud('goods', { action: 'delete', goodsId })
      showToast('已删除')
      loadList()
    } catch (e) {
      console.error('[my-goods] 删除失败', e)
    }
  }

  return (
    <div className="sub-page">
      <div className="sub-header">
        <span className="sub-title">我的发布</span>
      </div>

      {list.length ? (
        <div>
          {list.map((g) => (
            <div className="nm-card" key={g.id} style={{ padding: 12, marginBottom: 12 }}>
              <Link href={`/goods/${g.id}`} className="goods-row" style={{ border: 'none', padding: 0, marginBottom: 10 }}>
                {g.images?.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="goods-row-img" src={g.images[0]} alt="" />
                ) : (
                  <div className="goods-row-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛍️</div>
                )}
                <div className="goods-row-main">
                  <div className="goods-row-title ellipsis-2">{g.title}</div>
                  <div className="goods-row-sub" style={{ color: 'var(--nm-accent-2)', fontWeight: 600 }}>{g.priceText}</div>
                  <div className="goods-row-sub">{g.statusText} · {g.timeText}</div>
                </div>
              </Link>
              <div className="goods-row-actions">
                {g.status === 'on' && (
                  <>
                    <button className="mini-btn nm-btn" onClick={() => setStatus(g.id, 'off')}>下架</button>
                    <button className="mini-btn nm-btn" onClick={() => setStatus(g.id, 'sold')}>标记已卖出</button>
                  </>
                )}
                {(g.status === 'off' || g.status === 'sold') && (
                  <button className="mini-btn nm-btn" onClick={() => setStatus(g.id, 'on')}>重新上架</button>
                )}
                {g.status !== 'on' && (
                  <button className="mini-btn nm-btn" onClick={() => onDelete(g.id)}>删除</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div className="empty-title">还没有发布过商品</div>
          <div className="empty-desc">去发布你的第一件闲置吧</div>
        </div>
      )}
    </div>
  )
}
