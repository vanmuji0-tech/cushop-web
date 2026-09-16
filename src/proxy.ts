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
    // 跳转地址必须拼成「用户浏览器实际访问的域名」，不能直接用 req.nextUrl。
    //
    // 国内访问走 Netlify 反向代理（vercel.app 被 DNS 污染 + SNI 阻断，直连打不开，
    // 详见 netlify-proxy/）。反代会把 Host 改写成 cushop-web.vercel.app，用 nextUrl
    // 拼出的绝对地址指向被墙的域名——未登录用户被弹过去就直接撞墙，永远登不进来。
    //
    // 优先级：PUBLIC_ORIGIN（手动兜底，见下）> x-forwarded-host（反代注入的原始域名）
    //        > host（直连）> nextUrl.host
    //
    // 注：这里不能用相对 Location——Next 16 的 proxy 会把它当绝对 URL 解析并抛
    // ERR_INVALID_URL（已实测）。必须给绝对地址。
    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const host = forwardedHost || req.headers.get('host') || req.nextUrl.host
    const proto = forwardedProto || req.nextUrl.protocol.replace(':', '')

    // 如果反代没按约定注入 x-forwarded-host，在 Vercel 环境变量里设 PUBLIC_ORIGIN
    // （例如 https://cushop.netlify.app）即可确定性覆盖，不用再猜。
    const origin = process.env.PUBLIC_ORIGIN || `${proto}://${host}`

    const login = new URL('/login', origin)
    login.searchParams.set('next', path)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
}
