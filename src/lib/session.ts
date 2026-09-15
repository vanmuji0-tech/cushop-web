import 'server-only'
import { cookies } from 'next/headers'
import { encryptSession, decryptSession } from './jwt'
import { prisma } from './prisma'

const SESSION_COOKIE = 'session'

// 登录/注册成功后写 cookie
// remember=true：30 天免登录；remember=false：浏览器会话 cookie（关浏览器即退出）
export async function createSession(userId: string, remember = true) {
  const token = await encryptSession({ userId })
  const store = await cookies()
  const opts: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    path: string
    maxAge?: number
  } = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
  if (remember) opts.maxAge = 60 * 60 * 24 * 30
  store.set(SESSION_COOKIE, token, opts)
}

export async function deleteSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// 从 cookie 读出当前登录用户（不含 passwordHash）。未登录返回 null。
// 服务端所有路由用它做身份 + 权限判断（对应原云函数 OPENID 的角色）。
export async function getCurrentUser() {
  const store = await cookies()
  const payload = await decryptSession(store.get(SESSION_COOKIE)?.value)
  if (!payload?.userId) return null

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) return null

  const { passwordHash: _drop, ...safe } = user
  return safe
}
