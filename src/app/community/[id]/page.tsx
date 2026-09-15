'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { callCloud, getMe } from '@/lib/api'
import { formatTime, showToast } from '@/lib/ui'
import { reportTarget } from '@/lib/report'
import { Avatar } from '@/components/GoodsCard'

// 帖子详情：主体 + 盖楼回复树 + 点赞（照搬 pages/community/detail）
export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)

  const goLogin = () => {
    window.location.href = '/login?next=' + encodeURIComponent('/community/' + id)
  }

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
      const res = await callCloud('post', { action: 'detail', postId: id })
      setPost({ ...res.post, timeText: formatTime(res.post.createTime) })
      setLiked(!!res.liked)
      setLikeCount(res.post.likeCount || 0)
      setComments(organize(res.replies || []))
    } catch (e) {
      console.error('[community-detail] 加载失败', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    getMe().then(setMe)
    loadDetail()
  }, [loadDetail])

  async function onLike() {
    if (!me) return goLogin()
    try {
      const res = await callCloud('post', { action: 'toggleLike', postId: id })
      const delta = res.liked ? 1 : -1
      setLiked(res.liked)
      setLikeCount((c) => Math.max(0, c + delta))
    } catch (e) {
      console.error('[community-detail] 点赞失败', e)
    }
  }

  async function onSubmitComment() {
    if (!me) return goLogin()
    const content = (commentInput || '').trim()
    if (!content) return showToast('请输入内容')
    try {
      await callCloud('post', {
        action: 'replyCreate',
        postId: id,
        content,
        parentId: replyTo ? replyTo.id : '',
      })
      setCommentInput('')
      setReplyTo(null)
      setPost((p: any) => ({ ...p, replyCount: (p.replyCount || 0) + 1 }))
      loadDetail()
    } catch (e) {
      console.error('[community-detail] 回复失败', e)
    }
  }

  async function onDeleteReply(replyId: string) {
    if (!window.confirm('确定删除这条回复吗？')) return
    try {
      await callCloud('post', { action: 'replyDelete', replyId })
      setPost((p: any) => ({ ...p, replyCount: Math.max(0, (p.replyCount || 0) - 1) }))
      loadDetail()
    } catch (e) {
      console.error('[community-detail] 删除回复失败', e)
    }
  }

  async function onDeletePost() {
    if (!window.confirm('删除后不可恢复，确定删除吗？')) return
    try {
      await callCloud('post', { action: 'delete', postId: id })
      showToast('已删除')
      router.replace('/community')
    } catch (e) {
      console.error('[community-detail] 删除帖子失败', e)
    }
  }

  if (!post) {
    return (
      <div className="detail">
        <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 18, margin: '16px 0 10px' }} />
        <div className="skeleton" style={{ height: 14 }} />
        <div className="skeleton" style={{ height: 14, width: '70%', marginTop: 8 }} />
      </div>
    )
  }

  const isOwner = me?.id === post.userId

  return (
    <div className="detail">
      {/* 帖子主体 */}
      <div className="section nm-card">
        <div className="author-row">
          <Avatar src={post.userAvatar} name={post.userName} size={36} />
          <div className="author-info">
            <div className="author-name">{post.userName}</div>
            <div className="author-time">{post.timeText}</div>
          </div>
          {isOwner ? (
            <span className="post-action" onClick={onDeletePost}>删除</span>
          ) : (
            <span className="post-action" onClick={() => reportTarget('post', post.id)}>举报</span>
          )}
        </div>

        <div className="post-title">{post.title}</div>
        <div className="post-content" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>

        {post.images?.length ? (
          <div className="content-imgs">
            {post.images.map((src: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} className="cimg" src={src} alt="" loading="lazy" onClick={() => window.open(src, '_blank')} />
            ))}
          </div>
        ) : null}

        {post.tags?.length ? (
          <div className="tag-row">
            {post.tags.map((t: string) => (
              <span key={t} className="post-tag">#{t}</span>
            ))}
          </div>
        ) : null}

        <div className="post-foot">
          <div className={`like-btn nm-inset ${liked ? 'liked' : ''}`} onClick={onLike}>
            <span className="like-heart">{liked ? '♥' : '♡'}</span>
            <span className="like-num">{likeCount}</span>
          </div>
          <span className="reply-count">💬 {post.replyCount || 0} 条回复</span>
        </div>
      </div>

      {/* 盖楼区 */}
      <div className="section nm-card">
        <div className="section-title">全部回复</div>
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
                      <span className="c-del" onClick={() => onDeleteReply(c.id)}>删除</span>
                    ) : (
                      <span className="c-report" onClick={() => reportTarget('postReply', c.id)}>举报</span>
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
          <div className="comment-empty">还没有回复，来抢个沙发 ~</div>
        )}
      </div>

      {/* 回复输入栏 */}
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
