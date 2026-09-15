'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { callCloud } from '@/lib/api'
import { formatTime } from '@/lib/ui'
import { Avatar } from '@/components/GoodsCard'
import { HOT_TAGS } from '@/lib/topics'

const TAGS = ['全部', ...HOT_TAGS]

// 社群列表：话题流 + 单列帖子卡 + 发帖 FAB（照搬 pages/community/index）
export default function CommunityPage() {
  const [activeTag, setActiveTag] = useState('全部')
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(false)

  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadList = useCallback(
    async (p: number, refresh: boolean) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const tag = activeTag === '全部' ? '' : activeTag
        const data = await callCloud('post', { action: 'list', tag, page: p, pageSize: 20 })
        const items = (data.list || []).map((item: any) => {
          const images = item.images || []
          return {
            ...item,
            timeText: formatTime(item.createTime),
            covers: images.slice(0, 3),
            coverMore: Math.max(0, images.length - 3),
          }
        })
        setList((prev) => (refresh ? items : prev.concat(items)))
        setTotal(data.total)
        setHasMore(p * data.pageSize < data.total)
        setPage(p)
        setError(false)
      } catch (e) {
        console.error('[community] 加载失败', e)
        setError(true)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [activeTag]
  )

  useEffect(() => {
    setList([])
    setHasMore(true)
    setError(false)
    loadList(1, true)
  }, [loadList])

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

  function selectTag(tag: string) {
    if (tag === activeTag) return
    setActiveTag(tag)
  }

  return (
    <div className="community">
      {/* 话题流 */}
      <div className="tag-bar">
        {TAGS.map((t) => (
          <span key={t} className={`tag-pill ${activeTag === t ? 'tag-active' : ''}`} onClick={() => selectTag(t)}>
            {t}
          </span>
        ))}
      </div>

      {/* 帖子列表 */}
      {list.length > 0 ? (
        <>
          <div className="community-list">
            {list.map((item) => (
              <Link key={item.id} href={`/community/${item.id}`} className="post-card nm-card">
                <div className="post-head">
                  <Avatar src={item.userAvatar} name={item.userName} size={36} />
                  <div className="head-mid">
                    <div className="name">{item.userName}</div>
                    <div className="time">{item.timeText}</div>
                  </div>
                </div>

                <div className="post-title">{item.title}</div>
                {item.content ? <div className="post-content ellipsis-2">{item.content}</div> : null}

                {item.covers.length ? (
                  <div className="post-imgs">
                    {item.covers.map((src: string, i: number) => (
                      <div className="thumb-wrap" key={i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="thumb" src={src} alt="" loading="lazy" />
                        {i === 2 && item.coverMore > 0 ? <span className="cover-more">+{item.coverMore}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {item.tags?.length ? (
                  <div className="tag-row">
                    {item.tags.map((t: string) => (
                      <span key={t} className="post-tag">#{t}</span>
                    ))}
                  </div>
                ) : null}

                <div className="post-foot">
                  <span className="foot-item">💬 {item.replyCount || 0}</span>
                  <span className="foot-item">♡ {item.likeCount || 0}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="load-more" ref={sentinelRef}>
            {loading ? '' : error ? '加载失败，向上滚动重试' : hasMore ? '' : '— 没有更多了 —'}
          </div>
        </>
      ) : loading ? (
        <div className="community-list">
          {[0, 1, 2].map((i) => (
            <div className="post-card nm-card" key={i} style={{ pointerEvents: 'none' }}>
              <div className="post-head">
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div className="head-mid" style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '20%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 16, margin: '12px 0 8px' }} />
              <div className="skeleton" style={{ height: 14 }} />
              <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">加载失败</div>
          <button className="nm-btn empty-btn" onClick={() => loadList(1, true)}>重试</button>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">🏘️</div>
          <div className="empty-title">{activeTag === '全部' ? '还没有帖子' : '这个话题下还没有帖子'}</div>
          <div className="empty-desc">聊聊日常、晒晒闲置、问问邻居都行</div>
        </div>
      )}

      {/* 发帖 FAB */}
      <Link href="/community/publish" className="fab">
        <span className="fab-plus">＋</span>
        <span className="fab-text">发帖</span>
      </Link>
    </div>
  )
}
