import { Request, Response, NextFunction } from 'express'
import * as svc from './reports.service'

function mapError(err: any, res: Response, next: NextFunction) {
  if (err.message === 'FISCAL_YEAR_NOT_FOUND') {
    res.status(400).json({ success: false, error: { code: 'FISCAL_YEAR_NOT_FOUND', message: 'Räkenskapsåret finns inte' } })
    return
  }
  next(err)
}

export async function resultHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getResultReport(req.query as any)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}

export async function balanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getBalanceReport(req.query as any)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}

export async function vatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getVatReport(req.query as any)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}
