import { Request, Response, NextFunction } from 'express'
import * as svc from './accounts.service'

function notFound(res: Response) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Konto hittades inte' } })
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listAccounts(req.query as any)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.createAccount(req.body)
    res.status(201).json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'DUPLICATE_NUMBER') {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE_NUMBER', message: 'Kontonumret finns redan' } })
      return
    }
    next(err)
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateAccount(req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      notFound(res)
      return
    }
    next(err)
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.deleteAccount(req.params.id)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      notFound(res)
      return
    }
    next(err)
  }
}
