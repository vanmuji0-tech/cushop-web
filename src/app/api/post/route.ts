import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 post 的 Web 迁移：帖子（发布/列表/详情/删除）+ 盖楼回复 + 点赞
const HOT_TAGS = ['闲置经验', '求推荐', '避雷吐槽', '邻里互助', '随便聊聊']

// 剔除 BigInt 字段（ts 仅服务端防刷用）
const clean = (r: any) => {
  const { ts, ...rest } = r
  return rest
}

async function getPost(postId: string) {
  return prisma.post.findUnique({ where: { id: postId } })
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
      case 'detail': return await detail(event, uid)
      case 'toggleLike': return await toggleLike(event, uid)
      case 'replyCreate': return await replyCreate(event, user)
      case 'replyDelete': return await replyDelete(event, user)
      case 'delete': return await remove(event, user)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[post] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 发帖
async function create(event: any, user: any) {
  const { title, content = '', images = [], tags = [] } = event
  if (!user) return fail('请先登录')
  if (!title || !title.trim()) return fail('请填写标题')
  if (title.trim().length > 40) return fail('标题不能超过 40 字')
  if (!content.trim()) return fail('正文不能为空')
  if (content.trim().length > 2000) return fail('正文不能超过 2000 字')
  if (!Array.isArray(images) || images.length > 9) return fail('图片最多 9 张')
  if (!Array.isArray(tags) || tags.length > 3) return fail('话题最多 3 个')
  if (user.status === 'banned') return fail('账号已被封禁')

  const cleanTags = tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 3)

  const p = await prisma.post.create({
    data: {
      userId: user.id,
      userName: user.nickname || '新朋友',
      userAvatar: user.avatar || '',
      title: title.trim(),
      content: content.trim(),
      images: images.slice(0, 9),
      tags: cleanTags,
      likeCount: 0,
      replyCount: 0,
      status: 'normal',
      ts: BigInt(Date.now()),
    },
  })
  return ok({ id: p.id })
}

// 社群列表（按话题过滤 / 分页倒序）
async function list(event: any) {
  const { tag = '', page = 1, pageSize = 20 } = event
  const p = Math.max(1, parseInt(page) || 1)
  const size = Math.min(50, Math.max(1, parseInt(pageSize) || 20))

  const where: any = HOT_TAGS.includes(tag) ? { tags: { has: tag }, status: 'normal' } : { status: 'normal' }
  const [total, items] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({ where, orderBy: { createTime: 'desc' }, skip: (p - 1) * size, take: size }),
  ])
  return ok({ list: items.map(clean), total, page: p, pageSize: size })
}

// 详情：帖子 + 当前人是否赞过 + 全部回复
async function detail(event: any, uid: string) {
  const { postId } = event
  if (!postId) return fail('缺少帖子 ID')
  const post = await getPost(postId)
  if (!post || post.status !== 'normal') return fail('帖子不存在或已删除')

  let liked = false
  if (uid) {
    const lk = await prisma.postLike.findFirst({ where: { postId, userId: uid } })
    liked = !!lk
  }
  const replies = await prisma.postReply.findMany({
    where: { postId, status: 'normal' },
    orderBy: { createTime: 'asc' },
    take: 200,
  })
  return ok({ post: clean(post), liked, replies: replies.map(clean) })
}

// 点赞 / 取消赞（幂等）
async function toggleLike(event: any, uid: string) {
  const { postId } = event
  if (!uid) return fail('请先登录')
  if (!postId) return fail('缺少帖子 ID')
  const post = await getPost(postId)
  if (!post || post.status !== 'normal') return fail('帖子不存在或已删除')

  const exists = await prisma.postLike.findFirst({ where: { postId, userId: uid } })
  let liked: boolean
  if (exists) {
    await prisma.postLike.delete({ where: { id: exists.id } })
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } })
    liked = false
  } else {
    await prisma.postLike.create({ data: { postId, userId: uid, ts: BigInt(Date.now()) } })
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } })
    liked = true
  }
  return ok({ liked })
}

// 发回复（盖楼，30s 防刷）
async function replyCreate(event: any, user: any) {
  const { postId, content, parentId = '', toUserId = '', toUserName = '' } = event
  if (!user) return fail('请先登录')
  if (!postId) return fail('缺少帖子 ID')
  if (!content || !content.trim()) return fail('回复内容不能为空')
  if (content.trim().length > 500) return fail('回复不能超过 500 字')
  if (user.status === 'banned') return fail('账号已被封禁')

  const post = await getPost(postId)
  if (!post || post.status !== 'normal') return fail('帖子不存在或已删除')

  const recent = await prisma.postReply.findMany({
    where: { postId, userId: user.id },
    orderBy: { ts: 'desc' },
    take: 1,
  })
  if (recent.length) {
    const lastTs = Number(recent[0].ts || 0)
    if (Date.now() - lastTs < 30 * 1000) return fail('发言太快了，歇一会儿再发')
  }

  const r = await prisma.postReply.create({
    data: {
      postId,
      parentId: parentId || null,
      toUserId: toUserId || null,
      toUserName: toUserName || null,
      userId: user.id,
      userName: user.nickname || '新朋友',
      userAvatar: user.avatar || '',
      content: content.trim(),
      status: 'normal',
      ts: BigInt(Date.now()),
    },
  })
  await prisma.post.update({ where: { id: postId }, data: { replyCount: { increment: 1 } } })
  return ok({ id: r.id })
}

// 删除回复（本人或管理员）
async function replyDelete(event: any, user: any) {
  const { replyId } = event
  if (!replyId) return fail('缺少回复 ID')
  const r = await prisma.postReply.findUnique({ where: { id: replyId } })
  if (!r) return fail('回复不存在')
  if (!user) return fail('请先登录')
  const isAdmin = user.role === 'admin'
  if (r.userId !== user.id && !isAdmin) return fail('只能删除自己的回复')

  await prisma.postReply.update({ where: { id: replyId }, data: { status: 'deleted' } })
  await prisma.post.update({ where: { id: r.postId }, data: { replyCount: { decrement: 1 } } })
  return ok({ id: replyId })
}

// 删除帖子（本人或管理员，软删）
async function remove(event: any, user: any) {
  const { postId } = event
  if (!postId) return fail('缺少帖子 ID')
  const post = await getPost(postId)
  if (!post) return fail('帖子不存在')
  if (!user) return fail('请先登录')
  const isAdmin = user.role === 'admin'
  if (post.userId !== user.id && !isAdmin) return fail('只能删除自己的帖子')

  await prisma.post.update({ where: { id: postId }, data: { status: 'deleted' } })
  return ok({ id: postId })
}
