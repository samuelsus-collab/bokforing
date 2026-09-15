import { Request, Response, NextFunction } from 'express'

// Terminal felhanterare. Controllers mappar kända kod-strängar till HTTP;
// allt som når hit är oväntat och blir 500.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  // eslint-disable-next-line no-console
  console.error('[error]', err?.message ?? err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Ett internt fel inträffade' },
  })
}
