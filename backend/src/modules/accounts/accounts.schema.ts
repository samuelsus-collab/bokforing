import { z } from 'zod'

export const accountTypeEnum = z.enum(['TILLGANG', 'SKULD', 'EGET_KAPITAL', 'INTAKT', 'KOSTNAD'])

export const listAccountsSchema = z.object({
  type: accountTypeEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

export const createAccountSchema = z.object({
  number: z.number().int().min(1000).max(9999),
  name: z.string().min(1),
  type: accountTypeEnum,
  vatRate: z.number().min(0).max(100).nullable().optional(),
  sruCode: z.string().nullable().optional(),
})

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: accountTypeEnum.optional(),
  vatRate: z.number().min(0).max(100).nullable().optional(),
  sruCode: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type ListAccountsInput = z.infer<typeof listAccountsSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
