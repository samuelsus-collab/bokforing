import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { ReportQuery, LedgerQuery } from './reports.schema'
import {
  round2,
  computeResult,
  computeBalance,
  computeVat,
  computeYearEnd,
  type AccountSum,
} from './reports.calc'

export type { ReportLine, NeField } from './reports.calc'

// Bygg datum-/räkenskapsårsfilter för verifikationsrader.
async function buildRowFilter(q: ReportQuery) {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: q.fiscalYearId } })
  if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')

  // Rapporten omfattar hela räkenskapsåret (alla verifikationer kopplade till det).
  // from/to används bara för att snäva in perioden när det uttryckligen anges.
  const verWhere: Prisma.VerificationWhereInput = { fiscalYearId: q.fiscalYearId }
  if (q.from || q.to) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (q.from) dateFilter.gte = new Date(q.from)
    if (q.to) {
      const to = new Date(q.to)
      to.setDate(to.getDate() + 1)
      dateFilter.lt = to
    }
    verWhere.date = dateFilter
  }

  return { fy, where: { verification: verWhere } }
}

// Summera debet/kredit per konto för perioden.
async function sumsByAccount(where: Prisma.VerificationRowWhereInput): Promise<AccountSum[]> {
  const grouped = await prisma.verificationRow.groupBy({
    by: ['accountId'],
    where,
    _sum: { debit: true, credit: true },
  })
  const accounts = await prisma.account.findMany({
    where: { id: { in: grouped.map((g) => g.accountId) } },
    select: { id: true, number: true, name: true, type: true },
  })
  const byId = new Map(accounts.map((a) => [a.id, a]))
  return grouped
    .map((g) => {
      const acc = byId.get(g.accountId)!
      return { account: acc, debit: Number(g._sum.debit ?? 0), credit: Number(g._sum.credit ?? 0) }
    })
    .sort((a, b) => a.account.number - b.account.number)
}

export async function getResultReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)
  return { fiscalYear: { id: fy.id, label: fy.label }, ...computeResult(sums) }
}

export async function getBalanceReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)
  return { fiscalYear: { id: fy.id, label: fy.label }, ...computeBalance(sums) }
}

export async function getVatReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)
  return { fiscalYear: { id: fy.id, label: fy.label }, ...computeVat(sums) }
}

export async function getYearEndReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)
  const { result, ne } = computeYearEnd(sums)
  const balance = { fiscalYear: { id: fy.id, label: fy.label }, ...computeBalance(sums) }
  return {
    fiscalYear: { id: fy.id, label: fy.label, isClosed: fy.isClosed },
    result,
    balance,
    ne,
  }
}

// ─── HUVUDBOK (reskontra per konto) ──────────────────────────────────────────
// Alla verifikationsrader för ett konto i ett räkenskapsår, kronologiskt, med
// löpande saldo. Saldots tecken följer kontots normalsida.
export async function getLedgerReport(q: LedgerQuery) {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: q.fiscalYearId } })
  if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')
  const account = await prisma.account.findUnique({ where: { id: q.accountId } })
  if (!account) throw new Error('ACCOUNT_NOT_FOUND')

  const rows = await prisma.verificationRow.findMany({
    where: { accountId: q.accountId, verification: { fiscalYearId: q.fiscalYearId } },
    include: { verification: { select: { id: true, number: true, date: true, description: true } } },
  })

  // Sortera på verifikationsdatum, sedan verifikationsnummer.
  rows.sort((a, b) => {
    const t = a.verification.date.getTime() - b.verification.date.getTime()
    return t !== 0 ? t : a.verification.number - b.verification.number
  })

  // Debetsaldo för tillgångar/kostnader, kreditsaldo för skuld/EK/intäkt.
  const debitSide = account.type === 'TILLGANG' || account.type === 'KOSTNAD'

  let balance = 0
  let totalDebit = 0
  let totalCredit = 0
  const entries = rows.map((r) => {
    const debit = Number(r.debit)
    const credit = Number(r.credit)
    totalDebit = round2(totalDebit + debit)
    totalCredit = round2(totalCredit + credit)
    balance = round2(balance + (debitSide ? debit - credit : credit - debit))
    return {
      verificationId: r.verification.id,
      number: r.verification.number,
      date: r.verification.date,
      description: r.verification.description,
      rowDescription: r.description,
      debit,
      credit,
      balance,
    }
  })

  return {
    fiscalYear: { id: fy.id, label: fy.label },
    account: { id: account.id, number: account.number, name: account.name, type: account.type },
    entries,
    totalDebit,
    totalCredit,
    closingBalance: balance,
  }
}
