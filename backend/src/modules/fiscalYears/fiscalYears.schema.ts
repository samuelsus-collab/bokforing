import { z } from 'zod'

export const createFiscalYearSchema = z.object({
  label: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

export type CreateFiscalYearInput = z.infer<typeof createFiscalYearSchema>
