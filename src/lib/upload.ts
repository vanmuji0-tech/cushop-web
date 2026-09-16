'use client'

// 图片上传。三步：本机压缩 → 直传 Cloudinary（失败则退回服务端转发）。
//
// 【为什么要压缩】手机直出照片普遍 4–10MB，而 Vercel 对 Serverless Function 的
// 请求体有 4.5MB 硬上限。即便走直传不占 Vercel 带宽，压到 1600px/0.82 后只有
// 200–400KB，上传快得多、也省 Cloudinary 额度，看商品成色完全够。
//
// 【为什么优先直传】/api/upload 那条路要把整个文件先传给 Vercel 函数、再由函数
// 转发给 Cloudinary。超过 4.5MB 会被平台在函数执行前挡掉，返回的是 HTML 报错页
// 而不是 {code,msg} 信封——前端 res.json() 抛解析异常，真正的失败原因被盖住，
// 用户只看到「转一会儿然后没反应」。直传让图片二进制完全不经过 Vercel。
//
// 【为什么留兜底】直传依赖 /api/upload/sign 和 Cloudinary 的跨域响应，多一个环节
// 就多一处可能出问题。直传挂了就退回走服务端，两条路都断才把错误抛出去。

const MAX_EDGE = 1600
const QUALITY = 0.82
// 小图不值得再折腾一轮 canvas
const SKIP_BELOW = 300 * 1024

export type UploadFolder = 'cushop/goods' | 'cushop/community' | 'cushop/chat' | 'cushop/avatar'

// 失败时后端可能返回 HTML（平台报错页）而非 JSON，别让解析异常盖掉真正的错因
async function readJson(res: Response): Promise<any> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  // GIF 可能是动图，过 canvas 会掉帧
  if (file.type === 'image/gif' || file.size <= SKIP_BELOW) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    )
    // 压完反而更大（原图本就很高效）就用原图
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } catch {
    // 压缩失败不阻断主流程，退回原图让服务端去判断
    return file
  }
}

/** 路径一：向服务端要签名，浏览器直接把图 POST 给 Cloudinary。 */
async function uploadDirect(file: File, folder: UploadFolder): Promise<string> {
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  })
  const sign = await readJson(signRes)
  if (!signRes.ok || sign?.code !== 0) {
    throw new Error(sign?.msg || `获取上传签名失败（HTTP ${signRes.status}）`)
  }

  const { cloudName, apiKey, timestamp, signature } = sign.data
  // 字段必须与签名时用的参数集合一致：folder + timestamp
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', apiKey)
  fd.append('timestamp', String(timestamp))
  fd.append('folder', folder)
  fd.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  const out = await readJson(res)
  if (!res.ok || !out?.secure_url) {
    throw new Error(out?.error?.message || `上传失败（HTTP ${res.status}）`)
  }
  return out.secure_url as string
}

/** 路径二：整张图交给服务端转发（原始实现，作为兜底保留）。 */
async function uploadViaServer(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch('/api/upload', { method: 'POST', body: fd })

  if (res.status === 413) {
    throw new Error('图片太大了，换一张或先裁剪一下')
  }

  const body = await readJson(res)
  if (!res.ok) {
    throw new Error(body?.msg || `上传失败（HTTP ${res.status}）`)
  }
  if (body?.code !== 0) {
    throw new Error(body?.msg || '上传失败')
  }
  if (!body?.data?.url) {
    throw new Error('上传失败：服务端没有返回图片地址')
  }
  return body.data.url as string
}

/** 上传一张图，返回可直接入库的 https 地址。失败时抛出带原因的错误。 */
export async function uploadImage(file: File, folder: UploadFolder = 'cushop/goods'): Promise<string> {
  const payload = await compress(file)
  try {
    return await uploadDirect(payload, folder)
  } catch (directErr: any) {
    console.warn('[upload] 直传失败，退回服务端转发', directErr)
    try {
      return await uploadViaServer(payload)
    } catch (serverErr: any) {
      // 两条路都断：服务端的报错更贴近真相（配置/权限），优先用它
      throw new Error(serverErr?.message || directErr?.message || '上传失败')
    }
  }
}
