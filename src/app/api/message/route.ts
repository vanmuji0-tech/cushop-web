import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 message 的 Web 迁移：会话 / 消息 / 锁定成交 / 未读。
// 订阅消息（MESSAGE_NOTIFY_TEMPLATE_ID 为空）是死代码，不移植。

async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'conversation': return await conversation(event, uid)
      case 'conversationList': return await conversationList(uid)
      case 'unreadTotal': return await unreadTotal(uid)
      case 'messageList': return await messageList(event, uid)
      case 'send': return await send(event, uid)
      case 'lock': return await lock(event, uid)
      case 'confirmLock': return await confirmLock(event, uid)
      case 'cancelLock': return await cancelLock(event, uid)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[message] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

// 创建 / 获取会话（买家对某商品私聊卖家）
async function conversation(event: any, uid: string) {
  const { goodsId } = event
  if (!uid) return fail('请先登录')
  if (!goodsId) return fail('缺少商品 ID')

  const g = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!g) return fail('商品不存在')
  if (g.sellerId === uid) return fail('不能和自己私聊')

  const exist = await prisma.conversation.findFirst({ where: { goodsId, buyerId: uid } })
  if (exist) return ok(exist)

  const [buyerUser, sellerUser] = await Promise.all([getUser(uid), getUser(g.sellerId)])
  const conv = await prisma.conversation.create({
    data: {
      goodsId,
      goodsTitle: g.title || '',
      goodsImage: (g.images && g.images[0]) || '',
      buyerId: uid,
      sellerId: g.sellerId,
      buyerName: (buyerUser && buyerUser.nickname) || '买家',
      buyerAvatar: (buyerUser && buyerUser.avatar) || '',
      sellerName: g.sellerName || '卖家',
      sellerAvatar: (sellerUser && sellerUser.avatar) || g.sellerAvatar || '',
      lastMsg: '',
      unreadBuyer: 0,
      unreadSeller: 0,
    },
  })
  return ok(conv)
}

// 我的会话列表（附实时对方头像昵称 + 本方未读）
async function conversationList(uid: string) {
  if (!uid) return fail('请先登录')
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: uid }, { sellerId: uid }] },
    orderBy: { lastMsgTime: 'desc' },
    take: 100,
  })

  const peerIds = [...new Set(rows.map((c) => (c.buyerId === uid ? c.sellerId : c.buyerId)).filter(Boolean))]
  let userMap: Record<string, any> = {}
  if (peerIds.length) {
    const users = await prisma.user.findMany({ where: { id: { in: peerIds } } })
    users.forEach((u) => { userMap[u.id] = u })
  }

  const list = rows.map((c) => {
    const isBuyer = c.buyerId === uid
    const peerId = isBuyer ? c.sellerId : c.buyerId
    const peer = userMap[peerId]
    const fallbackName = peerId === c.sellerId ? c.sellerName : c.buyerName
    return {
      ...c,
      peerId: peerId || '',
      peerName: (peer && peer.nickname) || fallbackName || '',
      peerAvatar: (peer && peer.avatar) || '',
      unread: isBuyer ? c.unreadBuyer || 0 : c.unreadSeller || 0,
    }
  })
  return ok({ list })
}

// 我的未读总数（「我的」页消息红点）
async function unreadTotal(uid: string) {
  if (!uid) return fail('请先登录')
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: uid }, { sellerId: uid }] },
    take: 100,
  })
  let total = 0
  rows.forEach((c) => {
    total += c.buyerId === uid ? c.unreadBuyer || 0 : c.unreadSeller || 0
  })
  return ok({ total })
}

// 某会话的消息列表（仅成员；取消息同时清零本方未读）
async function messageList(event: any, uid: string) {
  const { conversationId } = event
  if (!uid) return fail('请先登录')
  if (!conversationId) return fail('缺少会话 ID')

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conv) return fail('会话不存在')
  const isBuyer = conv.buyerId === uid
  const isSeller = conv.sellerId === uid
  if (!isBuyer && !isSeller) return fail('无权限查看该会话')

  const list = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createTime: 'asc' },
    take: 200,
  })

  const field = isBuyer ? 'unreadBuyer' : 'unreadSeller'
  if ((conv as any)[field] > 0) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { [field]: 0 } as any })
  }
  return ok({ list })
}

// 发消息（文本/图片，仅成员；对方侧未读 +1）
async function send(event: any, uid: string) {
  const { conversationId, toId, content, type = 'text' } = event
  if (!uid) return fail('请先登录')
  if (!conversationId) return fail('缺少会话 ID')
  if (!toId) return fail('缺少接收方')

  const msgType = type === 'image' ? 'image' : 'text'
  const raw = content === undefined || content === null ? '' : String(content).trim()
  if (!raw) return fail(msgType === 'image' ? '图片消息缺少内容' : '消息不能为空')

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conv) return fail('会话不存在')
  const isBuyer = conv.buyerId === uid
  const isSeller = conv.sellerId === uid
  if (!isBuyer && !isSeller) return fail('你不是该会话成员')
  const otherId = isBuyer ? conv.sellerId : conv.buyerId
  if (toId !== otherId) return fail('接收方不正确')

  const preview = msgType === 'image' ? '[图片]' : raw
  const m = await prisma.message.create({
    data: {
      conversationId,
      fromId: uid,
      toId,
      type: msgType,
      content: raw,
      status: '',
    },
  })

  const updateData: any = { lastMsg: preview.slice(0, 30), lastMsgTime: new Date() }
  updateData[isBuyer ? 'unreadSeller' : 'unreadBuyer'] = { increment: 1 }
  await prisma.conversation.update({ where: { id: conversationId }, data: updateData })

  return ok({ id: m.id })
}

// 卖家发起锁定
async function lock(event: any, uid: string) {
  const { conversationId, goodsId, toId } = event
  if (!uid) return fail('请先登录')
  if (!conversationId || !goodsId || !toId) return fail('参数不全')

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!conv) return fail('会话不存在')
  if (conv.sellerId !== uid) return fail('只有卖家可发起锁定')
  if (toId !== conv.buyerId) return fail('接收方不正确')

  const g = await prisma.goods.findUnique({ where: { id: goodsId } })
  if (!g) return fail('商品不存在')
  if (g.sellerId !== uid) return fail('只有卖家可发起锁定')
  if (g.status !== 'on') return fail('商品当前不在售')

  const m = await prisma.message.create({
    data: {
      conversationId,
      goodsId,
      fromId: uid,
      toId,
      type: 'lock',
      content: '卖家发起锁定',
      status: 'pending',
    },
  })
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMsg: '[锁定请求]', lastMsgTime: new Date(), unreadBuyer: { increment: 1 } },
  })
  return ok({ id: m.id })
}

// 买家确认锁定 → 商品已卖出 + 生成成交回执 + 会话内回执卡
async function confirmLock(event: any, uid: string) {
  const { messageId } = event
  if (!messageId) return fail('缺少消息 ID')
  const msg = await prisma.message.findUnique({ where: { id: messageId } })
  if (!msg) return fail('消息不存在')
  if (msg.toId !== uid) return fail('只有买家可确认')
  // 幂等：已成交允许重复确认（双击不报错）；已取消则拒绝
  if (msg.status === 'cancelled') return fail('该请求已取消')
  if (msg.status === 'confirmed') return ok({ id: messageId })

  try {
    await prisma.$transaction(async (tx) => {
      // 事务内重读，串行化并发双击，避免重复生成 deal
      const cur = await tx.message.findUnique({ where: { id: messageId } })
      if (!cur || cur.status === 'cancelled' || cur.status === 'confirmed') return

      await tx.message.update({ where: { id: messageId }, data: { status: 'confirmed' } })
      await tx.goods.update({ where: { id: cur.goodsId || '' }, data: { status: 'sold' } })

      const existDeal = await tx.deal.findUnique({ where: { sourceMessageId: messageId } })
      if (existDeal) return

      const g = await tx.goods.findUnique({ where: { id: cur.goodsId || '' } })
      const sellerId = cur.fromId
      const buyerId = cur.toId
      const [sellerUser, buyerUser] = await Promise.all([
        tx.user.findUnique({ where: { id: sellerId } }),
        tx.user.findUnique({ where: { id: buyerId } }),
      ])
      const sellerName = (sellerUser && sellerUser.nickname) || '卖家'
      const buyerName = (buyerUser && buyerUser.nickname) || '买家'

      const deal = await tx.deal.create({
        data: {
          goodsId: cur.goodsId || '',
          goodsTitle: (g && g.title) || '',
          goodsImage: (g && g.images && g.images[0]) || '',
          price: (g && g.price) || 0,
          buyerId,
          buyerName,
          sellerId,
          sellerName,
          sourceMessageId: messageId,
          status: 'done',
        },
      })

      await tx.message.create({
        data: {
          conversationId: cur.conversationId,
          goodsId: cur.goodsId,
          fromId: buyerId,
          toId: sellerId,
          type: 'deal',
          content: '',
          status: 'done',
          dealId: deal.id,
          goodsTitle: deal.goodsTitle,
          goodsImage: deal.goodsImage,
          price: deal.price,
          buyerName,
          sellerName,
        },
      })
      await tx.conversation.update({
        where: { id: cur.conversationId },
        data: { lastMsg: '成交啦 🎉', lastMsgTime: new Date() },
      })
    })
    return ok({ id: messageId })
  } catch (e: any) {
    // 极端并发下 sourceMessageId 唯一约束兜底 → 视为已成交
    if (String(e?.message || '').includes('Unique constraint')) return ok({ id: messageId })
    throw e
  }
}

// 取消锁定（买家或卖家），商品恢复在售
async function cancelLock(event: any, uid: string) {
  const { messageId } = event
  if (!messageId) return fail('缺少消息 ID')
  const msg = await prisma.message.findUnique({ where: { id: messageId } })
  if (!msg) return fail('消息不存在')
  if (msg.fromId !== uid && msg.toId !== uid) return fail('无权限')

  await prisma.message.update({ where: { id: messageId }, data: { status: 'cancelled' } })
  if (msg.goodsId) {
    const g = await prisma.goods.findUnique({ where: { id: msg.goodsId } })
    if (g && g.status === 'sold') {
      await prisma.goods.update({ where: { id: msg.goodsId }, data: { status: 'on' } })
    }
  }
  return ok({ id: messageId })
}
