import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { paginate } from '../../utils/pagination'
import {
  CreateVerificationInput,
  ListVerificationsInput,
  UpdateVerificationInput,
} from './verifications.schema'

const VER_LIST_SELECT = {
  id: true,
  number: true,
  date: true,
  description: true,
  createdAt: true,
  fiscalYear: { select: { id: true, label: true, isClosed: true } },
  rows: { select: { debit: true, credit: true } },
}

const VER_DETAIL_SELECT = {
  id: true,
  number: true,
  date: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  fiscalYear: { select: { id: true, label: true, isClosed: true } },
  rows: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      debit: true,
      credit: true,
      description: true,
      sortOrder: true,
      account: { select: { id: true, number: true, name: true, type: true } },
    },
  },
}

type Row = { debit: number; credit: number }

// Avrunda till ören för att undvika flyttalsfel vid jämförelse.
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Kärnregeln: summa debet måste vara lika med summa kredit, och > 0.
// Exporterad så den kan enhetstestas fristående.
export function assertBalanced(rows: Row[]): { debitTotal: number; creditTotal: number } {
  const debitTotal = round2(rows.reduce((s, r) => s + (r.debit || 0), 0))
  const creditTotal = round2(rows.reduce((s, r) => s + (r.credit || 0), 0))
  if (debitTotal <= 0 || creditTotal <= 0) throw new Error('EMPTY_AMOUNT')
  if (debitTotal !== creditTotal) throw new Error('UNBALANCED')
  return { debitTotal, creditTotal }
}

// Nästa verifikationsnummer i en obruten serie per räkenskapsår.
async function nextVerificationNumber(
  tx: Prisma.TransactionClient,
  fiscalYearId: string
): Promise<number> {
  const agg = await tx.verification.aggregate({
    where: { fiscalYearId },
    _max: { number: true },
  })
  return (agg._max.number ?? 0) + 1
}

async function assertAccountsExist(tx: Prisma.TransactionClient, accountIds: string[]) {
  const unique = [...new Set(accountIds)]
  const found = await tx.account.count({ where: { id: { in: unique } } })
  if (found !== unique.length) throw new Error('ACCOUNT_NOT_FOUND')
}

export async function listVerifications(opts: ListVerificationsInput) {
  const where: Prisma.VerificationWhereInput = {}
  if (opts.fiscalYearId) where.fiscalYearId = opts.fiscalYearId
  if (opts.from || opts.to) {
    where.date = {}
    if (opts.from) where.date.gte = new Date(opts.from)
    if (opts.to) {
      const to = new Date(opts.to)
      to.setDate(to.getDate() + 1)
      where.date.lt = to
    }
  }
  if (opts.search) {
    const asNumber = Number(opts.search)
    where.OR = [
      { description: { contains: opts.search, mode: 'insensitive' } },
      ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
    ]
  }
  return paginate(
    prisma.verification,
    { where, select: VER_LIST_SELECT, orderBy: [{ date: 'desc' }, { number: 'desc' }] },
    opts.page,
    opts.pageSize
  )
}

export async function getVerificationById(id: string) {
  const ver = await prisma.verification.findUnique({ where: { id }, select: VER_DETAIL_SELECT })
  if (!ver) throw new Error('NOT_FOUND')
  return ver
}

export async function createVerification(input: CreateVerificationInput) {
  assertBalanced(input.rows)

  return prisma.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: input.fiscalYearId } })
    if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')
    if (fy.isClosed) throw new Error('FISCAL_YEAR_CLOSED')

    await assertAccountsExist(tx, input.rows.map((r) => r.accountId))

    const number = await nextVerificationNumber(tx, input.fiscalYearId)

    const created = await tx.verification.create({
      data: {
        number,
        fiscalYearId: input.fiscalYearId,
        date: new Date(input.date),
        description: input.description,
        rows: {
          create: input.rows.map((r, i) => ({
            accountId: r.accountId,
            debit: new Prisma.Decimal((r.debit || 0).toFixed(2)),
            credit: new Prisma.Decimal((r.credit || 0).toFixed(2)),
            description: r.description ?? null,
            sortOrder: i,
          })),
        },
      },
      select: VER_DETAIL_SELECT,
    })
    return created
  })
}

export async function updateVerification(id: string, input: UpdateVerificationInput) {
  if (input.rows) assertBalanced(input.rows)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.verification.findUnique({
      where: { id },
      include: { fiscalYear: true },
    })
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.fiscalYear.isClosed) throw new Error('FISCAL_YEAR_CLOSED')

    if (input.rows) {
      await assertAccountsExist(tx, input.rows.map((r) => r.accountId))
      await tx.verificationRow.deleteMany({ where: { verificationId: id } })
      await tx.verificationRow.createMany({
        data: input.rows.map((r, i) => ({
          verificationId: id,
          accountId: r.accountId,
          debit: new Prisma.Decimal((r.debit || 0).toFixed(2)),
          credit: new Prisma.Decimal((r.credit || 0).toFixed(2)),
          description: r.description ?? null,
          sortOrder: i,
        })),
      })
    }

    await tx.verification.update({
      where: { id },
      data: {
        date: input.date ? new Date(input.date) : undefined,
        description: input.description,
      },
    })

    return tx.verification.findUnique({ where: { id }, select: VER_DETAIL_SELECT })
  })
}

export async function deleteVerification(id: string) {
  const existing = await prisma.verification.findUnique({
    where: { id },
    include: { fiscalYear: true },
  })
  if (!existing) throw new Error('NOT_FOUND')
  if (existing.fiscalYear.isClosed) throw new Error('FISCAL_YEAR_CLOSED')

  await prisma.verification.delete({ where: { id } })
  return null
}
