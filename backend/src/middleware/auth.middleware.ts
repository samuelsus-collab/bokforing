import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthPayload {
  userId: string
  role: string
  email: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Ej inloggad' } })
    return
  }
  const token = header.slice('Bearer '.length)
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload
    req.user = { userId: decoded.userId, role: decoded.role, email: decoded.email }
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Ogiltig token' } })
  }
}
