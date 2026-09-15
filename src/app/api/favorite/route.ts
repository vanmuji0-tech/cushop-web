import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 favorite 的 Web 迁移：收藏 / 取消收藏 / 是否已收藏 / 我的收藏列表

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'toggle': return await toggle(event, uid)
      case 'check': return await check(event, uid)
      case 'list': return await list(uid)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[favorite] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 收藏 / 取消收藏
async function toggle(event: any, uid: string) {
  const { goodsId } = event
  if (!uid) return fail('请先登录')
  if (!goodsId) return fail('缺少商品 ID')

  const exist = await prisma.favorite.findFirst({ where: { userId: uid, goodsId } })
  if (exist) {
    await prisma.favorite.delete({ where: { id: exist.id } })
    await prisma.goods.update({ where: { id: goodsId }, data: { favCount: { decrement: 1 } } })
    return ok({ faved: false })
  }
  await prisma.favorite.create({ data: { userId: uid, goodsId } })
  await prisma.goods.update({ where: { id: goodsId }, data: { favCount: { increment: 1 } } })
  return ok({ faved: true })
}

// 是否已收藏（详情页初始化用）
async function check(event: any, uid: string) {
  const { goodsId } = event
  if (!uid || !goodsId) return ok({ faved: false })
  const exist = await prisma.favorite.findFirst({ where: { userId: uid, goodsId } })
  return ok({ faved: !!exist })
}

// 我的收藏列表（按收藏时间倒序，联表查商品）
async function list(uid: string) {
  if (!uid) return fail('请先登录')
  const favs = await prisma.favorite.findMany({
    where: { userId: uid },
    orderBy: { createTime: 'desc' },
    take: 200,
  })
  const goodsIds = favs.map((f) => f.goodsId)
  if (!goodsIds.length) return ok({ list: [] })

  const goodsRes = await prisma.goods.findMany({ where: { id: { in: goodsIds } } })
  const map: Record<string, any> = {}
  goodsRes.forEach((g) => { map[g.id] = g })
  const items = goodsIds.map((id) => map[id]).filter(Boolean)
  return ok({ list: items })
}
