import { getCurrentUser } from '@/lib/session'

// 前端恢复登录态：返回当前用户或 null
export async function GET() {
  const user = await getCurrentUser()
  return Response.json({ code: 0, data: user })
}
