import 'server-only'

// 统一 { code, data, msg } 信封响应 —— 照搬云函数 ok/fail 约定。
// 注意：data 里不能出现 bigint（JSON 无法序列化），各路由负责在返回前转成 Number 或剔除。

export function ok(data: unknown = {}) {
  return Response.json({ code: 0, data })
}

export function fail(msg: string, code = -1) {
  return Response.json({ code, msg })
}
