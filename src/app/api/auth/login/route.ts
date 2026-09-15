import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { username, password, remember = true } = await req.json()
    const name = (username || '').trim()
    const pw = password || ''

    if (!name || !pw) return Response.json({ code: -1, msg: '请输入用户名和密码' })

    const user = await prisma.user.findUnique({ where: { username: name } })
    if (!user || !verifyPassword(pw, user.passwordHash)) {
      return Response.json({ code: -1, msg: '用户名或密码错误' })
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } })
    await createSession(user.id, remember)
    const { passwordHash: _drop, ...safe } = user
    return Response.json({ code: 0, data: safe })
  } catch (e: any) {
    return Response.json({ code: -1, msg: '登录失败：' + e.message })
  }
}
