// Rena (databasfria) beräkningar för rapporterna – enkla att enhetstesta.

export interface ReportLine {
  accountId: string
  number: number
  name: string
  amount: number
}

export interface NeField {
  code: string
  label: string
  amount: number
}

export type AccountSum = {
  account: { id: string; number: number; name: string; type: string; vatRate?: number | null }
  debit: number
  credit: number
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const line = (s: AccountSum, amount: number): ReportLine => ({
  accountId: s.account.id,
  number: s.account.number,
  name: s.account.name,
  amount,
})

// Summera ett kontonummerintervall. 'debit' = debet − kredit, 'credit' = kredit − debet.
export function sumRange(sums: AccountSum[], lo: number, hi: number, direction: 'debit' | 'credit'): number {
  return round2(
    sums
      .filter((s) => s.account.number >= lo && s.account.number <= hi)
      .reduce((a, s) => a + (direction === 'debit' ? s.debit - s.credit : s.credit - s.debit), 0)
  )
}

// Resultaträkning: intäkter (kredit − debet), kostnader (debet − kredit).
export function computeResult(sums: AccountSum[]) {
  const income: ReportLine[] = []
  const expenses: ReportLine[] = []
  for (const s of sums) {
    if (s.account.type === 'INTAKT') {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0) income.push(line(s, amount))
    } else if (s.account.type === 'KOSTNAD') {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) expenses.push(line(s, amount))
    }
  }
  const totalIncome = round2(income.reduce((a, l) => a + l.amount, 0))
  const totalExpenses = round2(expenses.reduce((a, l) => a + l.amount, 0))
  return { income, expenses, totalIncome, totalExpenses, result: round2(totalIncome - totalExpenses) }
}

// Årets resultat (intäkter − kostnader).
export function yearResultOf(sums: AccountSum[]): number {
  const { result } = computeResult(sums)
  return result
}

// Balansräkning: tillgångar (debet − kredit), skuld/EK (kredit − debet).
// Årets resultat tas med så att balansen går ihop.
export function computeBalance(sums: AccountSum[]) {
  const assets: ReportLine[] = []
  const equityAndLiabilities: ReportLine[] = []
  for (const s of sums) {
    if (s.account.type === 'TILLGANG') {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) assets.push(line(s, amount))
    } else if (s.account.type === 'SKULD' || s.account.type === 'EGET_KAPITAL') {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0) equityAndLiabilities.push(line(s, amount))
    }
  }
  const yearResult = yearResultOf(sums)
  const totalAssets = round2(assets.reduce((a, l) => a + l.amount, 0))
  const totalEquityAndLiabilities = round2(equityAndLiabilities.reduce((a, l) => a + l.amount, 0) + yearResult)
  return {
    assets,
    equityAndLiabilities,
    yearResult,
    totalAssets,
    totalEquityAndLiabilities,
    diff: round2(totalAssets - totalEquityAndLiabilities),
  }
}

// Momsrapport (kontantmetoden) med momskontroll (avvikelse mot förväntad moms).
// Avvikelser > denna gräns (kr) flaggas.
const VAT_DEVIATION_TOLERANCE = 1

export function computeVat(sums: AccountSum[]) {
  const outputVat: ReportLine[] = []
  const inputVat: ReportLine[] = []
  let salesBase = 0
  // Förväntad utgående moms = summa (momspliktig försäljning × kontots momssats).
  let expectedOutputVat = 0

  for (const s of sums) {
    const n = s.account.number
    if (n >= 2610 && n <= 2639) {
      const amount = round2(s.credit - s.debit)
      if (amount !== 0) outputVat.push(line(s, amount))
    } else if (n >= 2640 && n <= 2649) {
      const amount = round2(s.debit - s.credit)
      if (amount !== 0) inputVat.push(line(s, amount))
    }
    if (s.account.type === 'INTAKT' && n >= 3000 && n <= 3799) {
      const net = s.credit - s.debit
      salesBase += net
      if (s.account.vatRate) expectedOutputVat += net * (Number(s.account.vatRate) / 100)
    }
  }

  const totalOutputVat = round2(outputVat.reduce((a, l) => a + l.amount, 0))
  const totalInputVat = round2(inputVat.reduce((a, l) => a + l.amount, 0))
  expectedOutputVat = round2(expectedOutputVat)
  // Avvikelse: bokförd utgående moms minus förväntad (baserat på försäljningen).
  const outputVatDeviation = round2(totalOutputVat - expectedOutputVat)
  const hasDeviation = Math.abs(outputVatDeviation) > VAT_DEVIATION_TOLERANCE

  return {
    salesBase: round2(salesBase),
    outputVat,
    inputVat,
    totalOutputVat,
    totalInputVat,
    netVat: round2(totalOutputVat - totalInputVat),
    expectedOutputVat,
    outputVatDeviation,
    hasDeviation,
  }
}

// Förenklat årsbokslut (K1): förenklad resultaträkning + NE-fält.
export function computeYearEnd(sums: AccountSum[]) {
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

  const r: NeField[] = [
    { code: 'R1', label: 'Försäljning och utfört arbete samt övriga momspliktiga intäkter', amount: momspliktigIntakter },
    { code: 'R2', label: 'Momsfria intäkter', amount: ovrigaIntakter },
    { code: 'R4', label: 'Ränteintäkter m.m.', amount: finansiellaIntakter },
    { code: 'R5', label: 'Varor, material och tjänster', amount: varukostnader },
    { code: 'R6', label: 'Övriga externa kostnader', amount: ovrigaExternaKostnader },
    { code: 'R7', label: 'Anställd personal', amount: personalkostnader },
    { code: 'R8', label: 'Räntekostnader m.m.', amount: finansiellaKostnader },
    {
      code: aretsResultat >= 0 ? 'R11' : 'R12',
      label: aretsResultat >= 0 ? 'Bokfört resultat (vinst)' : 'Bokfört resultat (förlust)',
      amount: Math.abs(aretsResultat),
    },
  ]

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

  return { result, ne: { r, b } }
}
