import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { username, password, nickname, remember = true } = await req.json()
    const name = (username || '').trim()
    const pw = password || ''

    if (!name) return Response.json({ code: -1, msg: '请输入用户名' })
    if (name.length < 2 || name.length > 20) return Response.json({ code: -1, msg: '用户名需 2-20 个字符' })
    if (pw.length < 6) return Response.json({ code: -1, msg: '密码至少 6 位' })

    const exist = await prisma.user.findUnique({ where: { username: name } })
    if (exist) return Response.json({ code: -1, msg: '用户名已被占用' })

    // 首个注册用户自动成为管理员（照搬原 register 云函数逻辑）
    const count = await prisma.user.count()
    const user = await prisma.user.create({
      data: {
        username: name,
        passwordHash: hashPassword(pw),
        nickname: nickname?.trim() || name,
        role: count === 0 ? 'admin' : 'user',
      },
    })

    await createSession(user.id, remember)
    const { passwordHash: _drop, ...safe } = user
    return Response.json({ code: 0, data: safe })
  } catch (e: any) {
    return Response.json({ code: -1, msg: '注册失败：' + e.message })
  }
}
