'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { callCloud, getMe } from '@/lib/api'
import { showToast } from '@/lib/ui'
import { HOT_TAGS } from '@/lib/topics'

// 发帖（照搬 pages/community/publish）
export default function CommunityPublishPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMe().then(setMe)
  }, [])

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag))
    } else if (tags.length >= 3) {
      showToast('话题最多选 3 个')
    } else {
      setTags(tags.concat(tag))
    }
  }

  function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remain = 9 - images.length
    const picked = files.slice(0, remain).map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setImages((prev) => prev.concat(picked))
    e.target.value = ''
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.slice()
      const removed = next.splice(idx, 1)[0]
      if (removed) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const r = await res.json()
    if (r?.code !== 0) throw new Error(r?.msg || '上传失败')
    return r.data.url
  }

  async function onSubmit() {
    if (submitting) return
    if (!title.trim()) return showToast('请填写标题')
    if (!content.trim()) return showToast('写点什么吧')

    setSubmitting(true)
    try {
      const urls: string[] = []
      for (const img of images) {
        urls.push(await uploadImage(img.file))
      }
      await callCloud('post', { action: 'create', title: title.trim(), content: content.trim(), images: urls, tags })
      showToast('发布成功')
      images.forEach((img) => URL.revokeObjectURL(img.preview))
      router.push('/community')
    } catch (e) {
      console.error('[community-publish] 发布失败', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!me) {
    return (
      <div className="empty">
        <div className="empty-icon">🏘️</div>
        <div className="empty-title">登录后才能发帖</div>
        <div className="empty-desc">聊聊日常、晒晒闲置、问问邻居</div>
      </div>
    )
  }

  return (
    <div className="publish">
      <div className="form">
        {/* 图片 */}
        <div className="pub-section nm-card">
          <div className="pub-section-title">图片（{images.length}/9，可不上传）</div>
          <div className="img-grid">
            {images.map((img, i) => (
              <div className="img-item" key={img.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" />
                <div className="img-del" onClick={() => removeImage(i)}>×</div>
              </div>
            ))}
            {images.length < 9 && (
              <div className="img-add nm-inset" onClick={() => fileRef.current?.click()}>
                <span className="img-add-icon">＋</span>
                <span>添加图片</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onChoose} />
        </div>

        {/* 标题 / 正文 */}
        <div className="pub-section nm-card">
          <div className="field">
            <div className="field-label">标题</div>
            <input className="nm-input" style={{ width: '100%' }} placeholder="一句话说清你想聊什么" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">正文</div>
            <textarea className="nm-input desc-textarea" style={{ minHeight: 120 }} placeholder="分享经验、晒闲置、求推荐、随手吐槽……" value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>

        {/* 话题 */}
        <div className="pub-section nm-card">
          <div className="pub-section-title">话题（选 {tags.length}/3）</div>
          <div className="tag-row wrap">
            {HOT_TAGS.map((t) => (
              <span key={t} className={`tag-pill ${tags.includes(t) ? 'tag-active' : ''}`} onClick={() => toggleTag(t)}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* 提交 */}
        <button className="submit-btn nm-btn-primary" disabled={submitting} onClick={onSubmit}>
          {submitting ? '发布中…' : '发布'}
        </button>
      </div>
    </div>
  )
}
