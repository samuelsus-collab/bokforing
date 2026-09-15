import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { CreateAccountInput, ListAccountsInput, UpdateAccountInput } from './accounts.schema'

const ACCOUNT_SELECT = {
  id: true,
  number: true,
  name: true,
  type: true,
  vatRate: true,
  sruCode: true,
  isActive: true,
}

export async function listAccounts(opts: ListAccountsInput) {
  const where: Prisma.AccountWhereInput = {}
  if (opts.type) where.type = opts.type
  if (opts.isActive !== undefined) where.isActive = opts.isActive
  if (opts.search) {
    const asNumber = Number(opts.search)
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
    ]
  }
  return prisma.account.findMany({
    where,
    select: ACCOUNT_SELECT,
    orderBy: { number: 'asc' },
  })
}

export async function createAccount(input: CreateAccountInput) {
  const existing = await prisma.account.findUnique({ where: { number: input.number } })
  if (existing) throw new Error('DUPLICATE_NUMBER')

  return prisma.account.create({
    data: {
      number: input.number,
      name: input.name,
      type: input.type,
      vatRate: input.vatRate != null ? new Prisma.Decimal(input.vatRate.toFixed(2)) : null,
      sruCode: input.sruCode ?? null,
    },
    select: ACCOUNT_SELECT,
  })
}

export async function updateAccount(id: string, input: UpdateAccountInput) {
  const existing = await prisma.account.findUnique({ where: { id } })
  if (!existing) throw new Error('NOT_FOUND')

  return prisma.account.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      vatRate:
        input.vatRate === undefined
          ? undefined
          : input.vatRate === null
            ? null
            : new Prisma.Decimal(input.vatRate.toFixed(2)),
      sruCode: input.sruCode,
      isActive: input.isActive,
    },
    select: ACCOUNT_SELECT,
  })
}

// Inaktivera i stället för att radera om kontot använts i verifikationer.
export async function deleteAccount(id: string) {
  const existing = await prisma.account.findUnique({
    where: { id },
    include: { _count: { select: { rows: true } } },
  })
  if (!existing) throw new Error('NOT_FOUND')

  if (existing._count.rows > 0) {
    return prisma.account.update({ where: { id }, data: { isActive: false }, select: ACCOUNT_SELECT })
  }
  await prisma.account.delete({ where: { id } })
  return null
}
