import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 goods 的 Web 迁移：发布 / 列表 / 详情 / 更新 / 删除 / 我的商品
const TRADE_TYPES = ['pickup', 'express', 'meet']

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'create': return await create(event, user)
      case 'list': return await list(event)
      case 'detail': return await detail(event)
      case 'update': return await update(event, uid)
      case 'myList': return await myList(uid)
      case 'delete': return await remove(event, uid)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[goods] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 发布商品
async function create(event: any, user: any) {
  const { title, price, desc = '', images = [], tags = [], tradeType = 'pickup' } = event
  if (!user) return fail('请先登录')
  if (!title || !title.trim()) return fail('请填写标题')
  if (title.trim().length > 30) return fail('标题不能超过 30 字')
  const p = Number(price)
  if (isNaN(p) || p < 0 || p > 99999) return fail('价格需在 0-99999 之间')
  if ((desc || '').length > 500) return fail('描述不能超过 500 字')
  if (!Array.isArray(images) || images.length > 9) return fail('图片最多 9 张')
  if (!Array.isArray(tags) || tags.length > 5) return fail('标签最多 5 个')
  if (!TRADE_TYPES.includes(tradeType)) return fail('交易方式无效')
  if (user.status === 'banned') return fail('账号已被封禁')

  const g = await prisma.goods.create({
    data: {
      sellerId: user.id,
      sellerName: user.nickname || '新朋友',
      sellerAvatar: user.avatar || '',
      sellerWechat: user.wechat || '',
      title: title.trim(),
      price: p,
      desc: desc || '',
      images: images.slice(0, 9),
      tags: tags.slice(0, 5),
      tradeType,
      status: 'on',
      views: 0,
      commentCount: 0,
      favCount: 0,
    },
  })
  return ok({ id: g.id })
}

// 广场列表（搜索 / 排序 / 分页）
async function list(event: any) {
  const { keyword = '', sort = 'time', order = 'desc', page = 1, pageSize = 20 } = event
  const p = Math.max(1, parseInt(page) || 1)
  const size = Math.min(50, Math.max(1, parseInt(pageSize) || 20))
  const kw = (keyword || '').trim()

  const where: any = { status: 'on' }
  if (kw) {
    where.OR = [
      { title: { contains: kw, mode: 'insensitive' } },
      { desc: { contains: kw, mode: 'insensitive' } },
    ]
  }
  const orderDir = order === 'asc' ? 'asc' : 'desc'
  const orderBy: any =
    sort === 'price' ? { price: orderDir } : { createTime: orderDir }

  const [total, items] = await Promise.all([
    prisma.goods.count({ where }),
    prisma.goods.findMany({ where, orderBy, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: items, total, page: p, pageSize: size })
}

// 详情（浏览量 +1）
async function detail(event: any) {
  const { goodsId } = event
  if (!goodsId) return fail('缺少商品 ID')
  const g = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!g) return fail('商品不存在或已删除')
  await prisma.goods.update({ where: { id: goodsId }, data: { views: { increment: 1 } } })
  return ok({ ...g, views: g.views + 1 })
}

// 更新（编辑 / 上下架 / 标记已卖出）
async function update(event: any, uid: string) {
  const { goodsId, ...patch } = event
  if (!goodsId) return fail('缺少商品 ID')
  const g = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!g) return fail('商品不存在')
  if (g.sellerId !== uid) return fail('只能操作自己的商品')

  const data: any = {}
  if ('status' in patch) {
    if (!['on', 'sold', 'off'].includes(patch.status)) return fail('状态无效')
    data.status = patch.status
  }
  if ('title' in patch) data.title = patch.title
  if ('price' in patch) data.price = Number(patch.price)
  if ('desc' in patch) data.desc = patch.desc
  if ('images' in patch) data.images = patch.images
  if ('tags' in patch) data.tags = patch.tags
  if ('tradeType' in patch) data.tradeType = patch.tradeType

  await prisma.goods.update({ where: { id: goodsId }, data })
  return ok({ id: goodsId })
}

// 我的商品列表（含所有状态）
async function myList(uid: string) {
  if (!uid) return fail('请先登录')
  const items = await prisma.goods.findMany({
    where: { sellerId: uid },
    orderBy: { createTime: 'desc' },
    take: 100,
  })
  return ok({ list: items })
}

// 删除（软删）
async function remove(event: any, uid: string) {
  const { goodsId } = event
  if (!goodsId) return fail('缺少商品 ID')
  const g = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!g) return fail('商品不存在')
  if (g.sellerId !== uid) return fail('只能删除自己的商品')
  await prisma.goods.update({ where: { id: goodsId }, data: { status: 'removed' } })
  return ok({ id: goodsId })
}
