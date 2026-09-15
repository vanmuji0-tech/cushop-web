import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 review 的 Web 迁移：成交后轻量互评（靠谱/一般/踩雷 + 一句话）
const GRADES = ['good', 'normal', 'bad']

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'submit': return await submit(event, uid)
      case 'myList': return await myList(event, uid)
      case 'delete': return await remove(event, user)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[review] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 提交评价：一次成交(dealId) 每人(fromId) 只能评一次
async function submit(event: any, uid: string) {
  const { dealId, grade, text = '' } = event
  if (!uid) return fail('请先登录')
  if (!dealId) return fail('缺少成交记录')
  if (!GRADES.includes(grade)) return fail('评价类型无效')
  if (text && text.trim().length > 50) return fail('一句话评价不能超过 50 字')

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return fail('成交记录不存在')
  const isBuyer = deal.buyerId === uid
  const isSeller = deal.sellerId === uid
  if (!isBuyer && !isSeller) return fail('你不是这笔交易的参与者')

  const exist = await prisma.review.findFirst({ where: { dealId, fromId: uid } })
  if (exist) return fail('你已评价过这笔交易')

  const toId = isBuyer ? deal.sellerId : deal.buyerId
  const fromUser = await prisma.user.findUnique({ where: { id: uid } })

  const r = await prisma.review.create({
    data: {
      dealId,
      goodsId: deal.goodsId || '',
      goodsTitle: deal.goodsTitle || '',
      fromId: uid,
      fromName: (fromUser && fromUser.nickname) || '用户',
      toId,
      grade,
      text: text.trim(),
      status: 'normal',
    },
  })
  return ok({ id: r.id })
}

// 我的评价（收到的 / 发出的）
async function myList(event: any, uid: string) {
  if (!uid) return fail('请先登录')
  const { type = 'received' } = event
  const where = type === 'sent' ? { fromId: uid, status: 'normal' } : { toId: uid, status: 'normal' }
  const list = await prisma.review.findMany({
    where,
    orderBy: { createTime: 'desc' },
    take: 100,
  })
  return ok({ list })
}

// 删除评价（本人或管理员）
async function remove(event: any, user: any) {
  const { reviewId } = event
  if (!reviewId) return fail('缺少评价 ID')
  const r = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!r) return fail('评价不存在')

  const isAdmin = user && user.role === 'admin'
  if (r.fromId !== user?.id && !isAdmin) return fail('只能删除自己的评价')

  await prisma.review.update({ where: { id: reviewId }, data: { status: 'deleted' } })
  return ok({ id: reviewId })
}
