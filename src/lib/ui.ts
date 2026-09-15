'use client'

// 前端 UI 工具 —— 照搬 utils/util.js（formatTime / formatPrice）+ toast 提示。

export function showToast(title: string) {
  window.dispatchEvent(new CustomEvent('toast', { detail: { title } }))
}

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)

/** 相对时间：刚刚 / x分钟前 / x小时前 / x天前 / 具体日期 */
export function formatTime(date: any): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + '分钟前'
  if (diff < day) return Math.floor(diff / hour) + '小时前'
  if (diff < 7 * day) return Math.floor(diff / day) + '天前'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 价格：0 → 面议，其余带 ¥ 并去掉多余小数 */
export function formatPrice(price: any): string {
  const n = Number(price)
  if (isNaN(n)) return '¥0'
  if (n === 0) return '面议'
  return '¥' + Math.round(n * 100) / 100
}

/** 交易方式文案 */
export const TRADE_TEXT: Record<string, string> = {
  pickup: '自提',
  express: '快递',
  meet: '面交',
}

/** 复制文本：优先 navigator.clipboard（需 HTTPS），移动端 Safari / 非 HTTPS 降级 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    throw new Error('clipboard 不可用，走降级')
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
