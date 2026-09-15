import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'

// 云函数 report 的 Web 迁移：举报（24h 同人同目标幂等）
const TARGET_TYPES = ['goods', 'comment', 'post', 'postReply', 'conversation', 'user']
const REPORT_WINDOW = 24 * 60 * 60 * 1000

const clean = (r: any) => {
  const { createTs, ...rest } = r
  return rest
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, ...event } = body
  const user = await getCurrentUser()
  const uid = user?.id || ''

  try {
    switch (action) {
      case 'create': return await create(event, uid)
      case 'myList': return await myList(uid)
      default: return fail('未知操作')
    }
  } catch (e: any) {
    console.error('[report] 失败', action, e)
    return fail('操作失败：' + e.message)
  }
}

async function create(event: any, uid: string) {
  const { targetType, targetId, reason, desc = '' } = event
  if (!uid) return fail('请先登录')
  if (!TARGET_TYPES.includes(targetType)) return fail('举报类型无效')
  if (!targetId) return fail('缺少举报对象')
  if (!reason) return fail('请选择举报理由')
  if (desc && desc.trim().length > 200) return fail('补充说明不能超过 200 字')

  // 幂等：同一人 24h 内对同一目标只报一次
  const since = Date.now() - REPORT_WINDOW
  const recent = await prisma.report.findFirst({
    where: { reporterId: uid, targetType, targetId, createTs: { gte: BigInt(since) } },
  })
  if (recent) return fail('你已举报过，请等待管理员处理')

  const r = await prisma.report.create({
    data: {
      targetType,
      targetId,
      reason,
      desc: (desc || '').trim(),
      reporterId: uid,
      status: 'pending',
      createTs: BigInt(Date.now()),
    },
  })
  return ok({ id: r.id })
}

async function myList(uid: string) {
  if (!uid) return fail('请先登录')
  const list = await prisma.report.findMany({
    where: { reporterId: uid },
    orderBy: { createTime: 'desc' },
    take: 50,
  })
  return ok({ list: list.map(clean) })
}
