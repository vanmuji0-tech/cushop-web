import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'
import { v2 as cloudinary } from 'cloudinary'

// 签发一次性上传签名，让浏览器把图**直接**传给 Cloudinary。
//
// 为什么不走 /api/upload 转发：Vercel 对 Serverless Function 的请求体有 4.5MB
// 硬上限，超出时会被平台在函数执行前挡掉，返回 HTML 报错页而非 {code,msg} 信封。
// 这里只签一个小 JSON，图片二进制完全不经过 Vercel——上限和函数超时同时消失，
// 而且上传直接打到 Cloudinary 的节点，比绕一圈快得多。
//
// 密钥不出服务端：只把 cloudName / apiKey / timestamp / signature 交给浏览器。

const ALLOWED_FOLDERS = ['cushop/goods', 'cushop/community', 'cushop/chat', 'cushop/avatar']

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail('请先登录')

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return fail('未配置图片服务（CLOUDINARY_* 密钥）')
    }

    // folder 参与签名，不能让客户端随便指定，否则等于开放任意目录写入
    const body = await req.json().catch(() => ({}))
    const folder = ALLOWED_FOLDERS.includes(body?.folder) ? body.folder : ALLOWED_FOLDERS[0]
    const timestamp = Math.floor(Date.now() / 1000)

    // 签名参数必须与前端实际提交的字段完全一致（file 和 api_key 不参与签名）
    const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret)

    return ok({ cloudName, apiKey, timestamp, folder, signature })
  } catch (e: any) {
    console.error('[upload/sign] 失败', e)
    return fail('获取上传签名失败：' + (e.message || '请检查图片服务配置'))
  }
}
