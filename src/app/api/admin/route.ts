import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 admin 的 Web 迁移：管理后台（13 action），全部校验管理员身份
const stripTs = (r: any) => {
  const { ts, ...rest } = r
  return rest
}
const stripCreateTs = (r: any) => {
  const { createTs, ...rest } = r
  return rest
}
const stripPassword = (r: any) => {
  const { passwordHash, ...rest } = r
  return rest
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return fail('无权限，仅管理员可操作')

  try {
    switch (action) {
      case 'goodsList': return await goodsList(event)
      case 'goodsStatus': return await goodsStatus(event)
      case 'commentList': return await commentList(event)
      case 'commentDelete': return await commentDelete(event)
      case 'postList': return await postList(event)
      case 'postDelete': return await postDelete(event)
      case 'userList': return await userList(event)
      case 'userBan': return await userBan(event)
      case 'stats': return await stats()
      case 'reviewList': return await reviewList(event)
      case 'reviewDelete': return await reviewDelete(event)
      case 'reportList': return await reportList(event)
      case 'reportHandle': return await reportHandle(event)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[admin] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

function paging(event: any) {
  const p = Math.max(1, parseInt(event.page) || 1)
  const size = Math.min(50, Math.max(1, parseInt(event.pageSize) || 20))
  return { p, size }
}

// 商品列表（所有状态，可按状态/关键词筛选）
async function goodsList(event: any) {
  const { status = '', keyword = '' } = event
  const { p, size } = paging(event)
  const where: any = {}
  if (status) where.status = status
  if (keyword && keyword.trim()) where.title = { contains: keyword.trim(), mode: 'insensitive' }
  const [total, list] = await Promise.all([
    prisma.goods.count({ where }),
    prisma.goods.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list, total })
}

// 设置商品状态（下架 off / 恢复 on / 删除 removed）
async function goodsStatus(event: any) {
  const { goodsId, status } = event
  if (!goodsId) return fail('缺少商品 ID')
  if (!['on', 'off', 'removed'].includes(status)) return fail('状态无效')
  await prisma.goods.update({ where: { id: goodsId }, data: { status } })
  return ok({ id: goodsId })
}

// 留言列表
async function commentList(event: any) {
  const { keyword = '' } = event
  const { p, size } = paging(event)
  const where: any = { status: 'normal' }
  if (keyword && keyword.trim()) where.content = { contains: keyword.trim(), mode: 'insensitive' }
  const [total, list] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: list.map(stripTs), total })
}

// 删除留言
async function commentDelete(event: any) {
  const { commentId } = event
  if (!commentId) return fail('缺少留言 ID')
  const c = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!c) return fail('留言不存在')
  await prisma.comment.update({ where: { id: commentId }, data: { status: 'deleted' } })
  await prisma.goods.update({ where: { id: c.goodsId }, data: { commentCount: { decrement: 1 } } })
  return ok({ id: commentId })
}

// 帖子列表
async function postList(event: any) {
  const { keyword = '' } = event
  const { p, size } = paging(event)
  const where: any = {}
  if (keyword && keyword.trim()) {
    where.OR = [
      { title: { contains: keyword.trim(), mode: 'insensitive' } },
      { content: { contains: keyword.trim(), mode: 'insensitive' } },
    ]
  }
  const [total, list] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: list.map(stripTs), total })
}

// 删除帖子（软删）
async function postDelete(event: any) {
  const { postId } = event
  if (!postId) return fail('缺少帖子 ID')
  const p = await prisma.post.findUnique({ where: { id: postId } })
  if (!p) return fail('帖子不存在')
  await prisma.post.update({ where: { id: postId }, data: { status: 'deleted' } })
  return ok({ id: postId })
}

// 用户列表
async function userList(event: any) {
  const { keyword = '' } = event
  const { p, size } = paging(event)
  const where: any = {}
  if (keyword && keyword.trim()) where.nickname = { contains: keyword.trim(), mode: 'insensitive' }
  const [total, list] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: list.map(stripPassword), total })
}

// 封禁/解封用户
async function userBan(event: any) {
  const { userId, banned } = event
  if (!userId) return fail('缺少用户 ID')
  await prisma.user.update({ where: { id: userId }, data: { status: banned ? 'banned' : 'normal' } })
  return ok({ id: userId })
}

// 数据统计
async function stats() {
  const [g, c, u] = await Promise.all([
    prisma.goods.count(),
    prisma.comment.count(),
    prisma.user.count(),
  ])
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const todayGoods = await prisma.goods.count({ where: { createTime: { gte: start } } })
  return ok({ goodsCount: g, commentCount: c, userCount: u, todayGoods })
}

// 评价列表
async function reviewList(event: any) {
  const { p, size } = paging(event)
  const [total, list] = await Promise.all([
    prisma.review.count({ where: { status: 'normal' } }),
    prisma.review.findMany({ where: { status: 'normal' }, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list, total })
}

// 删除评价
async function reviewDelete(event: any) {
  const { reviewId } = event
  if (!reviewId) return fail('缺少评价 ID')
  await prisma.review.update({ where: { id: reviewId }, data: { status: 'deleted' } })
  return ok({ id: reviewId })
}

// 举报列表
async function reportList(event: any) {
  const { status = '' } = event
  const { p, size } = paging(event)
  const where: any = status ? { status } : {}
  const [total, list] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: list.map(stripCreateTs), total })
}

// 处理举报：下架商品 / 删留言 / 删帖子 / 删帖子回复 / 封禁用户 / 忽略
async function reportHandle(event: any) {
  const { reportId, handle } = event
  if (!reportId) return fail('缺少举报 ID')
  const ACTIONS = ['goods_off', 'comment_delete', 'post_delete', 'postReply_delete', 'user_ban', 'ignore']
  if (!ACTIONS.includes(handle)) return fail('处理动作无效')

  const r = await prisma.report.findUnique({ where: { id: reportId } })
  if (!r) return fail('举报不存在')
  if (r.status !== 'pending') return fail('该举报已处理')

  if (handle === 'goods_off') {
    await prisma.goods.update({ where: { id: r.targetId }, data: { status: 'off' } })
  } else if (handle === 'comment_delete') {
    const c = await prisma.comment.findUnique({ where: { id: r.targetId } })
    if (c) {
      await prisma.comment.update({ where: { id: r.targetId }, data: { status: 'deleted' } })
      await prisma.goods.update({ where: { id: c.goodsId }, data: { commentCount: { decrement: 1 } } })
    }
  } else if (handle === 'post_delete') {
    await prisma.post.update({ where: { id: r.targetId }, data: { status: 'deleted' } })
  } else if (handle === 'postReply_delete') {
    const re = await prisma.postReply.findUnique({ where: { id: r.targetId } })
    if (re) {
      await prisma.postReply.update({ where: { id: r.targetId }, data: { status: 'deleted' } })
      await prisma.post.update({ where: { id: re.postId }, data: { replyCount: { decrement: 1 } } })
    }
  } else if (handle === 'user_ban') {
    await prisma.user.update({ where: { id: r.targetId }, data: { status: 'banned' } })
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: handle === 'ignore' ? 'ignored' : 'done', handle, handleTime: new Date() },
  })
  return ok({ id: reportId })
}
