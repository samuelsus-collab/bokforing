import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

// Terminal felhanterare. Controllers mappar kända kod-strängar till HTTP;
// kända Prisma-fel översätts här så de inte blir generiska 500:or.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Värdet finns redan (dubblett)' } })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Posten hittades inte' } })
      return
    }
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err?.message ?? err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Ett internt fel inträffade' },
  })
}
