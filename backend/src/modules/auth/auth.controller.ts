import { Request, Response, NextFunction } from 'express'
import * as svc from './auth.service'

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.login(req.body)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Fel e-post eller lösenord' } })
      return
    }
    next(err)
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.me(req.user!.userId)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Användare hittades inte' } })
      return
    }
    next(err)
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.changePassword(req.user!.userId, req.body)
    res.json({ success: true })
  } catch (err: any) {
    if (err.message === 'WRONG_PASSWORD') {
      res.status(400).json({ success: false, error: { code: 'WRONG_PASSWORD', message: 'Fel nuvarande lösenord' } })
      return
    }
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Användare hittades inte' } })
      return
    }
    next(err)
  }
}
