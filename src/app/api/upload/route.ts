import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { ok, fail } from '@/lib/respond'
import { v2 as cloudinary } from 'cloudinary'

// 图片上传：等价小程序 wx.cloud.uploadFile（客户端 → 云存储 → fileID），
// Web 版直接传 Cloudinary，返回 https 地址存库。fileID 中间层整个消失。

// Vercel 函数默认 10s 就掐断，返回的是平台的 HTML 报错页而不是 {code,msg} 信封，
// 前端 res.json() 会解析失败——表现为「转一会儿然后没反应」。给云存储转发留够时间。
export const maxDuration = 60

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail('请先登录')
    if (!process.env.CLOUDINARY_CLOUD_NAME) return fail('未配置图片服务（CLOUDINARY_* 密钥）')

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return fail('未收到图片')

    const bytes = Buffer.from(await file.arrayBuffer())
    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'cushop/goods' },
        (err, result) => (err ? reject(err) : resolve(result!.secure_url))
      )
      stream.end(bytes)
    })
    return ok({ url })
  } catch (e: any) {
    console.error('[upload] 失败', e)
    return fail('上传失败：' + (e.message || '请检查图片服务配置'))
  }
}
