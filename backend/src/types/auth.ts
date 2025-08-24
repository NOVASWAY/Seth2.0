import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    username: string
    role: string
    email?: string
  }
}

export interface JWTPayload {
  userId: string
  username: string
  role: string
  email?: string
}
