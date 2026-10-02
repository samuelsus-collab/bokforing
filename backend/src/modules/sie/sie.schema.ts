import { z } from 'zod'

export const exportSieSchema = z.object({
  fiscalYearId: z.string().min(1),
})

export const importSieSchema = z.object({
  fiscalYearId: z.string().min(1),
  contentBase64: z.string().min(1),
})

export type ImportSieInput = z.infer<typeof importSieSchema>
