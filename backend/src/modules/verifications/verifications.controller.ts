import { Request, Response, NextFunction } from 'express'
import * as svc from './verifications.service'

function notFound(res: Response) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verifikation hittades inte' } })
}

// Delad mappning av service-koder → HTTP.
function mapError(err: any, res: Response, next: NextFunction) {
  switch (err.message) {
    case 'NOT_FOUND':
      return notFound(res)
    case 'UNBALANCED':
      return res.status(400).json({ success: false, error: { code: 'UNBALANCED', message: 'Debet och kredit måste balansera' } })
    case 'EMPTY_AMOUNT':
      return res.status(400).json({ success: false, error: { code: 'EMPTY_AMOUNT', message: 'Verifikationen saknar belopp' } })
    case 'FISCAL_YEAR_NOT_FOUND':
      return res.status(400).json({ success: false, error: { code: 'FISCAL_YEAR_NOT_FOUND', message: 'Räkenskapsåret finns inte' } })
    case 'FISCAL_YEAR_CLOSED':
      return res.status(409).json({ success: false, error: { code: 'FISCAL_YEAR_CLOSED', message: 'Räkenskapsåret är låst (bokslut klart)' } })
    case 'DATE_OUTSIDE_FISCAL_YEAR':
      return res.status(400).json({ success: false, error: { code: 'DATE_OUTSIDE_FISCAL_YEAR', message: 'Verifikationsdatumet ligger utanför räkenskapsåret' } })
    case 'ACCOUNT_NOT_FOUND':
      return res.status(400).json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'Ett konto i verifikationen finns inte' } })
    default:
      return next(err)
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listVerifications(req.query as any)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getVerificationById(req.params.id)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.createVerification(req.body)
    res.status(201).json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateVerification(req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.deleteVerification(req.params.id)
    res.json({ success: true, data })
  } catch (err: any) {
    mapError(err, res, next)
  }
}
