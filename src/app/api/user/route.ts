import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 user 的 Web 迁移：卖家主页（公开资料 + 在售商品）/ 静默取头像昵称
// 注意：OPENID 已换成 users.id（cuid），sellerId 即用户 id。

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()

  try {
    switch (action) {
      case 'home': return await home(event)
      case 'profile': return await profile(event)
      case 'update': return await update(event, user)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[user] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 更新资料（昵称/头像/微信号/地区）—— 照搬 register 云函数的 update action
async function update(event: any, user: any) {
  if (!user) return fail('请先登录')
  const { nickname, avatar, wechat, region } = event

  const data: any = {}
  if (nickname !== undefined && nickname !== '') data.nickname = String(nickname).trim()
  if (avatar !== undefined) data.avatar = avatar
  if (wechat !== undefined) data.wechat = wechat
  if (region !== undefined) data.region = region

  if (Object.keys(data).length === 0) return fail('没有要更新的内容')

  const updated = await prisma.user.update({ where: { id: user.id }, data })
  const { passwordHash: _drop, ...safe } = updated
  return ok(safe)
}

// 卖家主页：公开资料 + 在售商品（免登可看，同广场）
async function home(event: any) {
  const { sellerId } = event
  if (!sellerId) return fail('缺少用户 ID')

  const u = await prisma.user.findUnique({ where: { id: sellerId } })
  if (!u) return fail('该用户不存在')

  const [goodsCount, goodsList, soldCount, goodCount, normalCount, badCount] = await Promise.all([
    prisma.goods.count({ where: { sellerId, status: 'on' } }),
    prisma.goods.findMany({ where: { sellerId, status: 'on' }, orderBy: { createTime: 'desc' }, take: 100 }),
    prisma.deal.count({ where: { sellerId } }),
    prisma.review.count({ where: { toId: sellerId, grade: 'good', status: 'normal' } }),
    prisma.review.count({ where: { toId: sellerId, grade: 'normal', status: 'normal' } }),
    prisma.review.count({ where: { toId: sellerId, grade: 'bad', status: 'normal' } }),
  ])

  const badges = {
    soldCount,
    reviewGood: goodCount,
    reviewNormal: normalCount,
    reviewBad: badCount,
  }

  const profile = {
    nickname: u.nickname || '',
    avatar: u.avatar || '',
    region: u.region || '',
    wechat: u.wechat || '',
    createTime: u.createTime || null,
  }

  return ok({ profile, badges, goodsCount, goods: goodsList })
}

// 聊天页静默取对方头像/昵称（无文档返回 null 而非报错）
async function profile(event: any) {
  const { userId, sellerId } = event
  const id = userId || sellerId
  if (!id) return ok({ profile: null })
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) return ok({ profile: null })
  return ok({ profile: { nickname: u.nickname || '', avatar: u.avatar || '' } })
}
