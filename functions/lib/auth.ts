import * as jose from 'jose'
import { parseCookies } from './cookies'

export interface UserPayload {
  id: string
  username: string
  nickname?: string
  avatarUrl?: string
  trustLevel: number
}

export async function verifyToken(token: string, secret: string): Promise<UserPayload | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, key)
    return {
      id: payload.id as string,
      username: payload.username as string,
      nickname: payload.nickname as string | undefined,
      avatarUrl: payload.avatarUrl as string | undefined,
      trustLevel: payload.trustLevel as number,
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(request: Request, jwtSecret: string): Promise<UserPayload | null> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['token']
  if (!token) return null
  return verifyToken(token, jwtSecret)
}
