import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { ReportQuery } from './reports.schema'

export interface ReportLine {
  accountId: string
  number: number
  name: string
  amount: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Bygg datum-/räkenskapsårsfilter för verifikationsrader.
async function buildRowFilter(q: ReportQuery) {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: q.fiscalYearId } })
  if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')

  const dateFilter: Prisma.DateTimeFilter = {}
  // Begränsa alltid inom räkenskapsåret; snäva in med from/to om angivet.
  dateFilter.gte = q.from ? new Date(q.from) : fy.startDate
  if (q.to) {
    const to = new Date(q.to)
    to.setDate(to.getDate() + 1)
    dateFilter.lt = to
  } else {
    const end = new Date(fy.endDate)
    end.setDate(end.getDate() + 1)
    dateFilter.lt = end
  }

  return { fy, where: { verification: { fiscalYearId: q.fiscalYearId, date: dateFilter } } }
}

// Summera debet/kredit per konto för perioden.
async function sumsByAccount(where: Prisma.VerificationRowWhereInput) {
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
      return {
        account: acc,
        debit: Number(g._sum.debit ?? 0),
        credit: Number(g._sum.credit ?? 0),
      }
    })
    .sort((a, b) => a.account.number - b.account.number)
}

// Resultaträkning: intäkter (kredit − debet) och kostnader (debet − kredit), positivt redovisade.
export async function getResultReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)

  const income: ReportLine[] = []
  const expenses: ReportLine[] = []

  for (const s of sums) {
    if (s.account.type === 'INTAKT') {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0) income.push({ accountId: s.account.id, number: s.account.number, name: s.account.name, amount })
    } else if (s.account.type === 'KOSTNAD') {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) expenses.push({ accountId: s.account.id, number: s.account.number, name: s.account.name, amount })
    }
  }

  const totalIncome = round2(income.reduce((a, l) => a + l.amount, 0))
  const totalExpenses = round2(expenses.reduce((a, l) => a + l.amount, 0))
  const result = round2(totalIncome - totalExpenses)

  return {
    fiscalYear: { id: fy.id, label: fy.label },
    income,
    expenses,
    totalIncome,
    totalExpenses,
    result,
  }
}

// Balansräkning: tillgångar (debet − kredit), skulder & eget kapital (kredit − debet).
// Årets resultat redovisas som en beräknad post så att balansen går ihop.
export async function getBalanceReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)

  const assets: ReportLine[] = []
  const equityAndLiabilities: ReportLine[] = []

  for (const s of sums) {
    if (s.account.type === 'TILLGANG') {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) assets.push({ accountId: s.account.id, number: s.account.number, name: s.account.name, amount })
    } else if (s.account.type === 'SKULD' || s.account.type === 'EGET_KAPITAL') {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0)
        equityAndLiabilities.push({ accountId: s.account.id, number: s.account.number, name: s.account.name, amount })
    }
  }

  // Årets resultat = intäkter − kostnader för perioden (ökar eget kapital).
  const totalIncome = round2(
    sums.filter((s) => s.account.type === 'INTAKT').reduce((a, s) => a + (s.credit - s.debit), 0)
  )
  const totalExpenses = round2(
    sums.filter((s) => s.account.type === 'KOSTNAD').reduce((a, s) => a + (s.debit - s.credit), 0)
  )
  const yearResult = round2(totalIncome - totalExpenses)

  const totalAssets = round2(assets.reduce((a, l) => a + l.amount, 0))
  const totalEquityAndLiabilities = round2(equityAndLiabilities.reduce((a, l) => a + l.amount, 0) + yearResult)

  return {
    fiscalYear: { id: fy.id, label: fy.label },
    assets,
    equityAndLiabilities,
    yearResult,
    totalAssets,
    totalEquityAndLiabilities,
    // Diff ska vara 0 om bokföringen balanserar.
    diff: round2(totalAssets - totalEquityAndLiabilities),
  }
}
