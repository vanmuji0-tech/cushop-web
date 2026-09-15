import { SignJWT, jwtVerify } from 'jose'

// 纯 JWT 加解密 —— 不依赖 Prisma / cookies，供 proxy 与服务端 session 共用
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-secret-change-me-in-production'
)

export type SessionPayload = { userId: string }

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as SessionPayload
  } catch {
    return null
  }
}
