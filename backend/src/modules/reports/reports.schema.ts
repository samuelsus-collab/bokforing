import { z } from 'zod'

export const reportQuerySchema = z.object({
  fiscalYearId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
})

export type ReportQuery = z.infer<typeof reportQuerySchema>

export const ledgerQuerySchema = z.object({
  fiscalYearId: z.string().min(1),
  accountId: z.string().min(1),
})

export type LedgerQuery = z.infer<typeof ledgerQuerySchema>
