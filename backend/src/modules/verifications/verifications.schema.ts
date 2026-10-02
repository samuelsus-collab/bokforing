import { z } from 'zod'

const rowSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
})

export const listVerificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  fiscalYearId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
})

export const createVerificationSchema = z.object({
  fiscalYearId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  rows: z
    .array(rowSchema)
    .min(2, 'En verifikation måste ha minst två rader')
    .refine(
      (rows) => rows.every((r) => (r.debit > 0) !== (r.credit > 0)),
      'Varje rad måste ha antingen debet eller kredit (inte båda, inte noll)'
    ),
})

export const updateVerificationSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1).optional(),
  rows: z
    .array(rowSchema)
    .min(2)
    .refine(
      (rows) => rows.every((r) => (r.debit > 0) !== (r.credit > 0)),
      'Varje rad måste ha antingen debet eller kredit (inte båda, inte noll)'
    )
    .optional(),
})

export type CreateVerificationInput = z.infer<typeof createVerificationSchema>
export type UpdateVerificationInput = z.infer<typeof updateVerificationSchema>
export type ListVerificationsInput = z.infer<typeof listVerificationsSchema>
