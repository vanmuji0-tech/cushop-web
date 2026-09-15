'use client'

import { useEffect, useState } from 'react'
import { callCloud } from '@/lib/api'
import { showToast } from '@/lib/ui'
import { REPORT_REASONS } from '@/lib/report'

// 全局举报弹层：监听 'report' 事件（reportTarget 触发），选理由后调 report.create
export default function ReportModal() {
  const [target, setTarget] = useState<{ targetType: string; targetId: string } | null>(null)
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onReport = (e: Event) => {
      const d = (e as CustomEvent).detail
      setTarget(d)
      setReason('')
      setDesc('')
    }
    window.addEventListener('report', onReport)
    return () => window.removeEventListener('report', onReport)
  }, [])

  async function submit() {
    if (!target) return
    if (!reason) return showToast('请选择举报理由')
    setSubmitting(true)
    try {
      await callCloud('report', {
        action: 'create',
        targetType: target.targetType,
        targetId: target.targetId,
        reason,
        desc: desc.trim(),
      })
      showToast('已提交举报')
      setTarget(null)
    } catch (e) {
      console.error('[report] 提交失败', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!target) return null
  return (
    <div className="modal-mask" onClick={() => setTarget(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">举报</div>
        <div className="report-reasons">
          {REPORT_REASONS.map((r) => (
            <span key={r} className={`report-reason ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>
              {r}
            </span>
          ))}
        </div>
        <textarea className="nm-input review-textarea" placeholder="补充说明（可选）" maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="modal-actions">
          <button className="nm-btn" onClick={() => setTarget(null)}>取消</button>
          <button className="nm-btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? '提交中…' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
