'use client'

import { useCallback, useEffect, useState } from 'react'
import { callCloud } from '@/lib/api'
import { showToast } from '@/lib/ui'
import GoodsCard from '@/components/GoodsCard'

// 我的收藏：双列卡 + 取消收藏（照搬 pages/mine/favorites）
export default function FavoritesPage() {
  const [list, setList] = useState<any[]>([])

  const loadList = useCallback(async () => {
    try {
      const data = await callCloud('favorite', { action: 'list' })
      setList(data.list || [])
    } catch (e) {
      console.error('[favorites] 加载失败', e)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function onCancel(goodsId: string) {
    try {
      await callCloud('favorite', { action: 'toggle', goodsId })
      showToast('已取消收藏')
      loadList()
    } catch (e) {
      console.error('[favorites] 取消失败', e)
    }
  }

  return (
    <div className="sub-page">
      <div className="sub-header">
        <span className="sub-title">我的收藏</span>
      </div>

      {list.length ? (
        <div className="list">
          {list.map((item) => (
            <div key={item.id} style={{ position: 'relative', width: 'calc(50% - 6px)' }}>
              <GoodsCard item={item} />
              <button
                className="mini-btn nm-btn"
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)' }}
                onClick={() => onCancel(item.id)}
              >
                取消
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">♡</div>
          <div className="empty-title">还没有收藏</div>
          <div className="empty-desc">看到喜欢的，点一下收藏吧</div>
        </div>
      )}
    </div>
  )
}
