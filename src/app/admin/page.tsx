'use client'

import { useCallback, useEffect, useState } from 'react'
import { callCloud, getMe } from '@/lib/api'
import { showToast } from '@/lib/ui'

const TABS = [
  { key: 'stats', label: '统计' },
  { key: 'goods', label: '商品' },
  { key: 'comments', label: '留言' },
  { key: 'users', label: '用户' },
  { key: 'reports', label: '举报' },
  { key: 'reviews', label: '评价' },
]
const STATUS_TEXT: Record<string, string> = { on: '在售', off: '已下架', sold: '已卖出', removed: '已删除' }
const REPORT_TARGET_TEXT: Record<string, string> = { goods: '商品', comment: '留言', post: '帖子', postReply: '帖子回复', conversation: '会话', user: '用户' }
const REPORT_STATUS_TEXT: Record<string, string> = { pending: '待处理', done: '已处理', ignored: '已忽略' }
const GRADE_TEXT: Record<string, string> = { good: '靠谱', normal: '一般', bad: '踩雷' }
const HANDLE_TEXT: Record<string, string> = { goods_off: '下架商品', comment_delete: '删除留言', post_delete: '删除帖子', postReply_delete: '删除回复', user_ban: '封禁用户', ignore: '忽略' }

// 管理后台（照搬 pages/admin/index），仅管理员可操作
export default function AdminPage() {
  const [me, setMe] = useState<any>(null)
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState<any>(null)
  const [goodsList, setGoodsList] = useState<any[]>([])
  const [commentList, setCommentList] = useState<any[]>([])
  const [userList, setUserList] = useState<any[]>([])
  const [reviewList, setReviewList] = useState<any[]>([])
  const [reportList, setReportList] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      if (tab === 'stats') {
        const s = await callCloud('admin', { action: 'stats' })
        setStats(s)
      } else if (tab === 'goods') {
        const res = await callCloud('admin', { action: 'goodsList', pageSize: 50 })
        setGoodsList((res.list || []).map((g: any) => ({ ...g, statusText: STATUS_TEXT[g.status] || g.status })))
      } else if (tab === 'comments') {
        const res = await callCloud('admin', { action: 'commentList', pageSize: 50 })
        setCommentList(res.list || [])
      } else if (tab === 'users') {
        const res = await callCloud('admin', { action: 'userList', pageSize: 50 })
        setUserList(res.list || [])
      } else if (tab === 'reviews') {
        const res = await callCloud('admin', { action: 'reviewList', pageSize: 50 })
        setReviewList((res.list || []).map((r: any) => ({ ...r, gradeText: GRADE_TEXT[r.grade] || r.grade })))
      } else if (tab === 'reports') {
        const res = await callCloud('admin', { action: 'reportList', pageSize: 50 })
        setReportList((res.list || []).map((r: any) => ({
          ...r,
          targetText: REPORT_TARGET_TEXT[r.targetType] || r.targetType,
          statusText: REPORT_STATUS_TEXT[r.status] || r.status,
        })))
      }
    } catch (e) {
      console.error('[admin] 加载失败', e)
    }
  }, [tab])

  useEffect(() => {
    getMe().then(setMe)
  }, [])

  useEffect(() => {
    if (me?.role === 'admin') loadData()
  }, [me, loadData])

  async function goodsStatus(goodsId: string, status: string) {
    try {
      await callCloud('admin', { action: 'goodsStatus', goodsId, status })
      showToast('操作成功')
      loadData()
    } catch (e) {
      console.error('[admin] 商品操作失败', e)
    }
  }

  async function commentDelete(commentId: string) {
    if (!window.confirm('确定删除这条违规留言吗？')) return
    try {
      await callCloud('admin', { action: 'commentDelete', commentId })
      showToast('已删除')
      loadData()
    } catch (e) {
      console.error('[admin] 删除失败', e)
    }
  }

  async function userBan(userId: string, banned: boolean) {
    try {
      await callCloud('admin', { action: 'userBan', userId, banned })
      showToast(banned ? '已封禁' : '已解封')
      loadData()
    } catch (e) {
      console.error('[admin] 封禁失败', e)
    }
  }

  async function reviewDelete(reviewId: string) {
    if (!window.confirm('确定删除这条评价吗？')) return
    try {
      await callCloud('admin', { action: 'reviewDelete', reviewId })
      showToast('已删除')
      loadData()
    } catch (e) {
      console.error('[admin] 删评价失败', e)
    }
  }

  async function reportHandle(reportId: string, handle: string) {
    const label = HANDLE_TEXT[handle] || handle
    if (!window.confirm(`确定执行「${label}」吗？`)) return
    try {
      await callCloud('admin', { action: 'reportHandle', reportId, handle })
      showToast('已处理')
      loadData()
    } catch (e) {
      console.error('[admin] 处理举报失败', e)
    }
  }

  if (me === null) return <div className="loading">加载中...</div>
  if (me.role !== 'admin') {
    return (
      <div className="empty">
        <div className="empty-icon">🛡️</div>
        <div className="empty-title">无权限</div>
        <div className="empty-desc">仅管理员可访问后台</div>
      </div>
    )
  }

  return (
    <div className="sub-page admin">
      <div className="tab-bar" style={{ flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <span key={t.key} className={`tab-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </span>
        ))}
      </div>

      {/* 统计 */}
      {tab === 'stats' && (
        <div className="stat-grid">
          {[
            { n: stats?.goodsCount, l: '商品总数' },
            { n: stats?.commentCount, l: '留言总数' },
            { n: stats?.userCount, l: '用户总数' },
            { n: stats?.todayGoods, l: '今日新增' },
          ].map((s, i) => (
            <div className="stat-card nm-card" key={i}>
              <div className="stat-num">{s.n ?? 0}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* 商品 */}
      {tab === 'goods' && (
        <div className="admin-list">
          {!goodsList.length ? <AdminEmpty icon="📦" text="暂无商品" /> : goodsList.map((g) => (
            <div className="admin-item nm-card" key={g.id}>
              <div className="admin-main">
                <div className="admin-title ellipsis">{g.title}</div>
                <div className="admin-sub">{g.sellerName} · {g.price === 0 ? '面议' : '¥' + g.price} · {g.statusText}</div>
              </div>
              <button className="mini-btn nm-btn" onClick={() => goodsStatus(g.id, g.status === 'on' ? 'off' : 'on')}>
                {g.status === 'on' ? '下架' : '恢复'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 留言 */}
      {tab === 'comments' && (
        <div className="admin-list">
          {!commentList.length ? <AdminEmpty icon="💬" text="暂无留言" /> : commentList.map((c) => (
            <div className="admin-item nm-card" key={c.id}>
              <div className="admin-main">
                <div className="admin-sub">{c.userName} 在「{c.goodsTitle}」留言</div>
                <div className="admin-content">{c.content}</div>
              </div>
              <button className="mini-btn nm-btn" onClick={() => commentDelete(c.id)}>删除</button>
            </div>
          ))}
        </div>
      )}

      {/* 用户 */}
      {tab === 'users' && (
        <div className="admin-list">
          {!userList.length ? <AdminEmpty icon="👥" text="暂无用户" /> : userList.map((u) => (
            <div className="admin-item nm-card" key={u.id}>
              <div className="admin-main">
                <div className="admin-title">{u.nickname} {u.role === 'admin' ? '👑' : ''}</div>
                <div className="admin-sub">{u.status === 'banned' ? '已封禁' : '正常'}</div>
              </div>
              {u.status === 'normal' && u.role !== 'admin' ? (
                <button className="mini-btn nm-btn" onClick={() => userBan(u.id, true)}>封禁</button>
              ) : null}
              {u.status === 'banned' ? (
                <button className="mini-btn nm-btn" onClick={() => userBan(u.id, false)}>解封</button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 举报 */}
      {tab === 'reports' && (
        <div className="admin-list">
          {!reportList.length ? <AdminEmpty icon="🚨" text="暂无举报" /> : reportList.map((r) => (
            <div className="admin-item nm-card" key={r.id}>
              <div className="admin-main">
                <div className="admin-title">{r.targetText} · {r.reason} <span className="status-chip">{r.statusText}</span></div>
                <div className="admin-sub">目标：{r.targetId}</div>
                {r.desc ? <div className="admin-content">{r.desc}</div> : null}
              </div>
              {r.status === 'pending' && (
                <div className="item-actions">
                  {r.targetType === 'goods' && <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'goods_off')}>下架商品</button>}
                  {r.targetType === 'comment' && <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'comment_delete')}>删留言</button>}
                  {r.targetType === 'post' && <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'post_delete')}>删帖子</button>}
                  {r.targetType === 'postReply' && <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'postReply_delete')}>删回复</button>}
                  {r.targetType === 'user' && <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'user_ban')}>封禁</button>}
                  <button className="mini-btn nm-btn" onClick={() => reportHandle(r.id, 'ignore')}>忽略</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 评价 */}
      {tab === 'reviews' && (
        <div className="admin-list">
          {!reviewList.length ? <AdminEmpty icon="⭐" text="暂无评价" /> : reviewList.map((r) => (
            <div className="admin-item nm-card" key={r.id}>
              <div className="admin-main">
                <div className="admin-title">{r.fromName} → {r.gradeText} · {r.goodsTitle}</div>
                {r.text ? <div className="admin-content">{r.text}</div> : null}
              </div>
              <button className="mini-btn nm-btn" onClick={() => reviewDelete(r.id)}>删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{text}</div>
    </div>
  )
}
