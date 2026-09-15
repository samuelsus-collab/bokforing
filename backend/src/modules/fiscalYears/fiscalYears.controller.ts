import { Request, Response, NextFunction } from 'express'
import * as svc from './fiscalYears.service'

function notFound(res: Response) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Räkenskapsår hittades inte' } })
}

export async function listHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listFiscalYears()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.createFiscalYear(req.body)
    res.status(201).json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'DUPLICATE_LABEL') {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE_LABEL', message: 'Räkenskapsåret finns redan' } })
      return
    }
    if (err.message === 'INVALID_RANGE') {
      res.status(400).json({ success: false, error: { code: 'INVALID_RANGE', message: 'Slutdatum måste vara efter startdatum' } })
      return
    }
    next(err)
  }
}

export async function closeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.closeFiscalYear(req.params.id)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      notFound(res)
      return
    }
    next(err)
  }
}

export async function reopenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.reopenFiscalYear(req.params.id)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      notFound(res)
      return
    }
    next(err)
  }
}
