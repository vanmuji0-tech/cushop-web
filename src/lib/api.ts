'use client'

// 前端统一 API 调用封装 —— 等价于小程序 utils/cloud.js 的 callCloud。
// 约定返回结构 { code, data, msg }：code === 0 成功返回 data，否则抛错。

export async function callCloud<T = any>(
  name: string,
  data: Record<string, any> = {},
  opts: { silent?: boolean } = {}
): Promise<T> {
  try {
    const res = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (result && result.code === 0) {
      return result.data as T
    }
    const msg = (result && result.msg) || '操作失败'
    throw new Error(msg)
  } catch (err: any) {
    if (!opts.silent) {
      const msg = err?.message || '网络异常，请重试'
      window.dispatchEvent(new CustomEvent('toast', { detail: { title: msg } }))
    }
    throw err
  }
}

// 恢复当前登录用户（未登录返回 null）。等价于小程序 getApp().globalData.userInfo。
export async function getMe<T = any>(): Promise<T | null> {
  try {
    const res = await fetch('/api/auth/me')
    const result = await res.json()
    return result?.code === 0 ? (result.data as T) : null
  } catch {
    return null
  }
}
