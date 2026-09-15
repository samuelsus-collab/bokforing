import { Request, Response, NextFunction } from 'express'

const ROLE_HIERARCHY: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role
    if (!userRole) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Ej inloggad' } })
      return
    }
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0
    const requiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] ?? 99))
    if (userLevel < requiredLevel) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Otillräcklig behörighet' } })
      return
    }
    next()
  }
}
