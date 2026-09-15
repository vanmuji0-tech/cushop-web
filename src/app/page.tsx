'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { callCloud } from '@/lib/api'
import GoodsCard from '@/components/GoodsCard'

// 广场：搜索 / 排序 / 双列大图卡 / 无限滚动（照搬 pages/square/square）
export default function SquarePage() {
  const [keyword, setKeyword] = useState('') // 输入框实时值
  const [search, setSearch] = useState('') // 防抖后真正用于请求的搜索词
  const [sort, setSort] = useState<'time' | 'price'>('time')
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(false)

  const loadingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadList = useCallback(
    async (p: number, refresh: boolean) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const data = await callCloud('goods', {
          action: 'list',
          keyword: search,
          sort,
          order: sort === 'price' ? 'asc' : 'desc',
          page: p,
          pageSize: 20,
        })
        setList((prev) => (refresh ? data.list : prev.concat(data.list)))
        setTotal(data.total)
        setHasMore(p * data.pageSize < data.total)
        setPage(p)
        setError(false)
      } catch (e) {
        console.error('[square] 加载失败', e)
        setError(true)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [search, sort]
  )

  // 输入 → 防抖 → 更新 search（真正触发请求）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(keyword), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [keyword])

  // search / sort 变化时刷新（首屏也走这里）
  useEffect(() => {
    setList([])
    setHasMore(true)
    setError(false)
    loadList(1, true)
  }, [loadList])

  // 无限滚动：哨兵进入视口加载下一页
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadList(page + 1, false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, page, loadList])

  function onSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearch(keyword) // 回车/点搜索立即生效，跳过防抖
  }

  function setSortAndReload(s: 'time' | 'price') {
    if (s === sort) return
    setSort(s)
  }

  return (
    <div className="square">
      {/* 搜索栏 */}
      <div className="search-bar">
        <div className="search-input-wrap nm-inset">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="搜搜看有没有你想要的"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
        <button className="search-btn nm-btn" onClick={onSearch}>
          搜索
        </button>
      </div>

      {/* 排序 */}
      <div className="sort-bar">
        <span className={`sort-item ${sort === 'time' ? 'sort-active' : ''}`} onClick={() => setSortAndReload('time')}>
          最新
        </span>
        <span className={`sort-item ${sort === 'price' ? 'sort-active' : ''}`} onClick={() => setSortAndReload('price')}>
          价格最低
        </span>
      </div>

      {/* 列表：双列大图卡 */}
      {list.length > 0 ? (
        <>
          <div className="list">
            {list.map((item) => (
              <GoodsCard key={item.id} item={item} />
            ))}
          </div>
          <div className="load-more" ref={sentinelRef}>
            {loading ? '加载中...' : error ? '加载失败，向上滚动重试' : hasMore ? '' : '— 没有更多了 —'}
          </div>
        </>
      ) : loading ? (
        <div className="list">
          {[0, 1, 2, 3].map((i) => (
            <div className="goods-card" key={i} style={{ pointerEvents: 'none' }}>
              <div className="skeleton" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 0 }} />
              <div className="goods-info">
                <div className="skeleton" style={{ height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 17, width: '55%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">加载失败</div>
          <div className="empty-desc">网络异常或服务暂不可用</div>
          <button className="nm-btn empty-btn" onClick={() => loadList(1, true)}>
            重试
          </button>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">🛍️</div>
          <div className="empty-title">{search ? '没有找到相关商品' : '广场空空如也'}</div>
          <div className="empty-desc">{search ? '换个关键词试试' : '成为第一个发布闲置的人吧'}</div>
        </div>
      )}
    </div>
  )
}
