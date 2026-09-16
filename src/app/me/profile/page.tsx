'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, callCloud } from '@/lib/api'
import { showToast } from '@/lib/ui'
import { uploadImage } from '@/lib/upload'
import { Avatar } from '@/components/GoodsCard'

// 个人资料：编辑昵称 / 头像 / 微信号 / 地区（照搬 pages/mine/profile）
export default function ProfilePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('')
  const [wechat, setWechat] = useState('')
  const [region, setRegion] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMe().then((u) => {
      if (!u) return
      setNickname(u.nickname || '')
      setAvatar(u.avatar || '')
      setWechat(u.wechat || '')
      setRegion(u.region || '')
    })
  }, [])

  async function onChooseAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      setAvatar(await uploadImage(f, 'cushop/avatar'))
      showToast('头像已更新')
    } catch (err: any) {
      console.error('[profile] 头像上传失败', err)
      showToast(err?.message || '头像上传失败，请重试')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function onSave() {
    if (saving) return
    if (!nickname.trim()) return showToast('请填写昵称')
    setSaving(true)
    try {
      await callCloud('user', {
        action: 'update',
        nickname: nickname.trim(),
        avatar,
        wechat: wechat.trim(),
        region: region.trim(),
      })
      showToast('已保存')
      router.back()
    } catch (e) {
      console.error('[profile] 保存失败', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sub-page">
      <div className="sub-header">
        <span className="sub-title">个人资料</span>
      </div>

      {/* 头像 */}
      <div className="nm-card" style={{ padding: 24, textAlign: 'center', marginBottom: 12 }}>
        <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', display: 'inline-block' }}>
          <Avatar src={avatar} name={nickname} size={64} />
          <div style={{ fontSize: 12, color: 'var(--text-weak)', marginTop: 8 }}>
            {uploading ? '上传中…' : '点击更换头像'}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onChooseAvatar} />
      </div>

      {/* 资料表单 */}
      <div className="nm-card" style={{ padding: 16 }}>
        <div className="field">
          <div className="field-label">昵称</div>
          <input className="nm-input" style={{ width: '100%' }} placeholder="你的昵称" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">微信号（方便买家联系你）</div>
          <input className="nm-input" style={{ width: '100%' }} placeholder="选填" value={wechat} onChange={(e) => setWechat(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">所在地区（方便同城交易）</div>
          <input className="nm-input" style={{ width: '100%' }} placeholder="选填，如：北京朝阳" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
      </div>

      <button className="nm-btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 16, marginTop: 16 }} disabled={saving} onClick={onSave}>
        {saving ? '保存中…' : '保存'}
      </button>
    </div>
  )
}
