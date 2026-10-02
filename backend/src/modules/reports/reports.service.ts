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

// Momsrapport (kontantmetoden): utgående moms (2610–2639), ingående moms (2640–2649)
// och momspliktig försäljning (3000–3799) för perioden. Netto = utgående − ingående.
export async function getVatReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)

  const outputVat: ReportLine[] = [] // utgående moms (kredit − debet)
  const inputVat: ReportLine[] = [] // ingående moms (debet − kredit)
  let salesBase = 0 // momspliktig försäljning, netto exkl. moms

  for (const s of sums) {
    const n = s.account.number
    if (n >= 2610 && n <= 2639) {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0) outputVat.push({ accountId: s.account.id, number: n, name: s.account.name, amount })
    } else if (n >= 2640 && n <= 2649) {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) inputVat.push({ accountId: s.account.id, number: n, name: s.account.name, amount })
    }
    if (s.account.type === 'INTAKT' && n >= 3000 && n <= 3799) {
      salesBase += s.credit - s.debit
    }
  }

  const totalOutputVat = round2(outputVat.reduce((a, l) => a + l.amount, 0))
  const totalInputVat = round2(inputVat.reduce((a, l) => a + l.amount, 0))
  const netVat = round2(totalOutputVat - totalInputVat)

  return {
    fiscalYear: { id: fy.id, label: fy.label },
    salesBase: round2(salesBase),
    outputVat,
    inputVat,
    totalOutputVat,
    totalInputVat,
    // Positivt = moms att betala till Skatteverket, negativt = moms att få tillbaka.
    netVat,
  }
}

// ─── FÖRENKLAT ÅRSBOKSLUT (K1) + NE-UNDERLAG ─────────────────────────────────

type AccountSum = { account: { id: string; number: number; name: string; type: string }; debit: number; credit: number }

export interface NeField {
  code: string
  label: string
  amount: number
}

// Summera ett kontonummerintervall. riktning 'debit' = debet − kredit, 'credit' = kredit − debet.
function sumRange(sums: AccountSum[], lo: number, hi: number, direction: 'debit' | 'credit'): number {
  return round2(
    sums
      .filter((s) => s.account.number >= lo && s.account.number <= hi)
      .reduce((a, s) => a + (direction === 'debit' ? s.debit - s.credit : s.credit - s.debit), 0)
  )
}

export async function getYearEndReport(q: ReportQuery) {
  const { fy, where } = await buildRowFilter(q)
  const sums = await sumsByAccount(where)

  // Förenklad resultaträkning, grupperad enligt NE-blankettens logik.
  const momspliktigIntakter = sumRange(sums, 3000, 3799, 'credit')
  const ovrigaIntakter = sumRange(sums, 3800, 3999, 'credit')
  const finansiellaIntakter = sumRange(sums, 8300, 8399, 'credit')
  const varukostnader = sumRange(sums, 4000, 4999, 'debit')
  const ovrigaExternaKostnader = sumRange(sums, 5000, 6999, 'debit')
  const personalkostnader = sumRange(sums, 7000, 7699, 'debit')
  const finansiellaKostnader = sumRange(sums, 8400, 8499, 'debit')

  const totalaIntakter = round2(momspliktigIntakter + ovrigaIntakter + finansiellaIntakter)
  const totalaKostnader = round2(varukostnader + ovrigaExternaKostnader + personalkostnader + finansiellaKostnader)
  const aretsResultat = round2(totalaIntakter - totalaKostnader)

  const result = {
    momspliktigIntakter,
    ovrigaIntakter,
    finansiellaIntakter,
    varukostnader,
    ovrigaExternaKostnader,
    personalkostnader,
    finansiellaKostnader,
    totalaIntakter,
    totalaKostnader,
    aretsResultat,
  }

  // Balansräkning vid årets slut (återanvänder balansrapporten).
  const balance = await getBalanceReport(q)

  // NE-bilagans R-fält (resultat).
  const r: NeField[] = [
    { code: 'R1', label: 'Försäljning och utfört arbete samt övriga momspliktiga intäkter', amount: momspliktigIntakter },
    { code: 'R2', label: 'Momsfria intäkter', amount: ovrigaIntakter },
    { code: 'R4', label: 'Ränteintäkter m.m.', amount: finansiellaIntakter },
    { code: 'R5', label: 'Varor, material och tjänster', amount: varukostnader },
    { code: 'R6', label: 'Övriga externa kostnader', amount: ovrigaExternaKostnader },
    { code: 'R7', label: 'Anställd personal', amount: personalkostnader },
    { code: 'R8', label: 'Räntekostnader m.m.', amount: finansiellaKostnader },
    { code: aretsResultat >= 0 ? 'R11' : 'R12', label: aretsResultat >= 0 ? 'Bokfört resultat (vinst)' : 'Bokfört resultat (förlust)', amount: Math.abs(aretsResultat) },
  ]

  // NE-bilagans B-fält (balans vid årets slut).
  const b: NeField[] = [
    { code: 'B4', label: 'Maskiner och inventarier', amount: sumRange(sums, 1200, 1299, 'debit') },
    { code: 'B6', label: 'Varulager', amount: sumRange(sums, 1400, 1499, 'debit') },
    { code: 'B7', label: 'Kundfordringar', amount: sumRange(sums, 1500, 1599, 'debit') },
    { code: 'B8', label: 'Övriga fordringar', amount: sumRange(sums, 1600, 1799, 'debit') },
    { code: 'B9', label: 'Kassa och bank', amount: sumRange(sums, 1900, 1999, 'debit') },
    { code: 'B10', label: 'Eget kapital', amount: sumRange(sums, 2010, 2099, 'credit') },
    { code: 'B13', label: 'Låneskulder', amount: sumRange(sums, 2300, 2399, 'credit') },
    { code: 'B15', label: 'Leverantörsskulder', amount: sumRange(sums, 2440, 2449, 'credit') },
    { code: 'B16', label: 'Övriga skulder (inkl. moms)', amount: sumRange(sums, 2600, 2999, 'credit') },
  ]

  return {
    fiscalYear: { id: fy.id, label: fy.label, isClosed: fy.isClosed },
    result,
    balance,
    ne: { r, b },
  }
}
