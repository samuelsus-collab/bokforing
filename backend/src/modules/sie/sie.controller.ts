import { Request, Response, NextFunction } from 'express'
import * as svc from './sie.service'

export async function exportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { fiscalYearId } = req.query as { fiscalYearId: string }
    const content = await svc.exportSie(fiscalYearId)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="export.se"')
    res.send(content)
  } catch (err: any) {
    if (err.message === 'FISCAL_YEAR_NOT_FOUND') {
      res.status(400).json({ success: false, error: { code: 'FISCAL_YEAR_NOT_FOUND', message: 'Räkenskapsåret finns inte' } })
      return
    }
    next(err)
  }
}

export async function importHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { fiscalYearId, contentBase64 } = req.body as { fiscalYearId: string; contentBase64: string }
    const buf = Buffer.from(contentBase64, 'base64')
    const content = svc.decodeSie(buf)
    const result = await svc.importSie(fiscalYearId, content)
    res.json({ success: true, data: result })
  } catch (err: any) {
    const msg: string = err.message ?? ''
    if (msg === 'FISCAL_YEAR_NOT_FOUND') {
      res.status(400).json({ success: false, error: { code: 'FISCAL_YEAR_NOT_FOUND', message: 'Räkenskapsåret finns inte' } })
      return
    }
    if (msg === 'FISCAL_YEAR_CLOSED') {
      res.status(409).json({ success: false, error: { code: 'FISCAL_YEAR_CLOSED', message: 'Räkenskapsåret är låst' } })
      return
    }
    if (msg === 'IMPORT_TOO_LARGE') {
      res.status(413).json({ success: false, error: { code: 'IMPORT_TOO_LARGE', message: 'SIE-filen är för stor för att importeras' } })
      return
    }
    if (msg.startsWith('IMPORT_UNBALANCED')) {
      res.status(400).json({
        success: false,
        error: { code: 'IMPORT_UNBALANCED', message: `En verifikation balanserar inte: ${msg.split(':')[1] ?? ''}` },
      })
      return
    }
    next(err)
  }
}
