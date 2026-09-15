import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 comment 的 Web 迁移：留言 / 回复 / 列表 / 删除
// 订阅消息（COMMENT_NOTIFY_TEMPLATE_ID 为空）本就是死代码，不移植。

// 剔除 BigInt 字段（ts 仅服务端防刷用，JSON 无法序列化 bigint）
const clean = (c: any) => {
  const { ts, ...rest } = c
  return rest
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'create': return await create(event, user)
      case 'list': return await list(event)
      case 'mine': return await mine(uid)
      case 'delete': return await remove(event, user)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[comment] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 发留言 / 回复
async function create(event: any, user: any) {
  const { goodsId, content, parentId = '' } = event
  if (!user) return fail('请先登录')
  if (!goodsId) return fail('缺少商品 ID')
  if (!content || !content.trim()) return fail('留言内容不能为空')
  if (content.trim().length > 500) return fail('留言不能超过 500 字')
  if (user.status === 'banned') return fail('账号已被封禁')

  const goodsDoc = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!goodsDoc) return fail('商品不存在')

  // 30 秒防刷：同一用户对同一商品
  const recent = await prisma.comment.findMany({
    where: { goodsId, userId: user.id },
    orderBy: { ts: 'desc' },
    take: 1,
  })
  if (recent.length) {
    const lastTs = Number(recent[0].ts || 0)
    if (Date.now() - lastTs < 30 * 1000) return fail('发言太快了，歇一会儿再发')
  }

  const c = await prisma.comment.create({
    data: {
      goodsId,
      goodsTitle: goodsDoc.title || '',
      sellerId: goodsDoc.sellerId,
      userId: user.id,
      userName: user.nickname || '新朋友',
      userAvatar: user.avatar || '',
      content: content.trim(),
      parentId: parentId || null,
      status: 'normal',
      ts: BigInt(Date.now()),
    },
  })

  await prisma.goods.update({ where: { id: goodsId }, data: { commentCount: { increment: 1 } } })
  return ok({ id: c.id })
}

// 留言列表（含回复，前端按 parentId 组织）
async function list(event: any) {
  const { goodsId } = event
  if (!goodsId) return fail('缺少商品 ID')
  const items = await prisma.comment.findMany({
    where: { goodsId, status: 'normal' },
    orderBy: { createTime: 'asc' },
    take: 200,
  })
  return ok({ list: items.map(clean) })
}

// 我的留言（收到的 + 发出的）
async function mine(uid: string) {
  if (!uid) return fail('请先登录')
  const [received, sent] = await Promise.all([
    prisma.comment.findMany({
      where: { sellerId: uid, status: 'normal' },
      orderBy: { createTime: 'desc' },
      take: 50,
    }),
    prisma.comment.findMany({
      where: { userId: uid, status: 'normal' },
      orderBy: { createTime: 'desc' },
      take: 50,
    }),
  ])
  return ok({ received: received.map(clean), sent: sent.map(clean) })
}

// 删除留言（本人或管理员）
async function remove(event: any, user: any) {
  const { commentId } = event
  if (!commentId) return fail('缺少留言 ID')
  const c = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!c) return fail('留言不存在')

  const isAdmin = user && user.role === 'admin'
  if (c.userId !== user?.id && !isAdmin) return fail('只能删除自己的留言')

  await prisma.comment.update({ where: { id: commentId }, data: { status: 'deleted' } })
  await prisma.goods.update({ where: { id: c.goodsId }, data: { commentCount: { decrement: 1 } } })
  return ok({ id: commentId })
}
