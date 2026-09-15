'use client'

// 通用举报入口：派发事件 → ReportModal 弹层选理由 → report.create（照搬 utils/report.js）
export const REPORT_REASONS = ['广告', '虚假信息', '违规物品', '骚扰', '其他']

export function reportTarget(targetType: string, targetId: string) {
  window.dispatchEvent(new CustomEvent('report', { detail: { targetType, targetId } }))
}
