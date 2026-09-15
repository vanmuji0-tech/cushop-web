import { NextRequest, NextResponse } from 'next/server'
import { decryptSession } from '@/lib/jwt'

// 需要登录的页面（未登录重定向到 /login，并回跳）
const protectedPrefixes = [
  '/publish',
  '/me',
  '/messages',
  '/chat',
  '/community/publish',
  '/admin',
]

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const needAuth = protectedPrefixes.some((p) => path === p || path.startsWith(p + '/'))
  if (!needAuth) return NextResponse.next()

  // 乐观检查：只解 cookie，不查库（角色校验在数据访问层做）
  const token = req.cookies.get('session')?.value
  const payload = await decryptSession(token)
  if (!payload?.userId) {
    const login = new URL('/login', req.nextUrl)
    login.searchParams.set('next', path)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
}
