'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { callCloud, getMe } from '@/lib/api'
import { showToast } from '@/lib/ui'

// 发布商品：选图（本地上传 → Cloudinary）→ goods.create（照搬 pages/goods/publish）
export default function PublishPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState('')
  const [tradeType, setTradeType] = useState('pickup')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMe().then(setMe)
  }, [])

  function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remain = 9 - images.length
    const picked = files.slice(0, remain).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
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
    const result = await res.json()
    if (result?.code !== 0) throw new Error(result?.msg || '上传失败')
    return result.data.url
  }

  async function onSubmit() {
    if (submitting) return
    if (!title.trim()) return showToast('请填写标题')
    if (price === '' || isNaN(Number(price))) return showToast('请填写价格')

    setSubmitting(true)
    try {
      const urls: string[] = []
      for (const img of images) {
        urls.push(await uploadImage(img.file))
      }
      const tagList = tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)

      await callCloud('goods', {
        action: 'create',
        title: title.trim(),
        price: Number(price),
        desc: desc.trim(),
        images: urls,
        tags: tagList,
        tradeType,
      })

      showToast('发布成功')
      images.forEach((img) => URL.revokeObjectURL(img.preview))
      router.push('/')
    } catch (e) {
      console.error('[publish] 发布失败', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!me) {
    return (
      <div className="empty">
        <div className="empty-icon">🛍️</div>
        <div className="empty-title">登录后才能发布</div>
        <div className="empty-desc">挂上你的闲置，让好东西继续发光</div>
      </div>
    )
  }

  return (
    <div className="publish">
      <div className="form">
        {/* 图片上传 */}
        <div className="pub-section nm-card">
          <div className="pub-section-title">图片（{images.length}/9）</div>
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

        {/* 基本信息 */}
        <div className="pub-section nm-card">
          <div className="field">
            <div className="field-label">标题</div>
            <input className="nm-input" style={{ width: '100%' }} placeholder="一句话描述你的东西" value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">价格（元）</div>
            <input className="nm-input" style={{ width: '100%' }} type="number" placeholder="0 表示面议" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">描述</div>
            <textarea className="nm-input desc-textarea" placeholder="成色、入手渠道、瑕疵等，越详细越好卖" value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="field">
            <div className="field-label">标签（逗号分隔，最多 5 个）</div>
            <input className="nm-input" style={{ width: '100%' }} placeholder="如：九成新,自提,可小刀" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>

        {/* 交易方式 */}
        <div className="pub-section nm-card">
          <div className="pub-section-title">交易方式</div>
          <div className="trade-row">
            {[
              { k: 'pickup', label: '自提' },
              { k: 'express', label: '快递' },
              { k: 'meet', label: '面交' },
            ].map((t) => (
              <div key={t.k} className={`trade-item ${tradeType === t.k ? 'trade-active' : ''}`} onClick={() => setTradeType(t.k)}>
                {t.label}
              </div>
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
