import { describe, it, expect } from 'vitest'
import { computeResult, computeBalance, computeVat, computeYearEnd, sumRange, type AccountSum } from './reports.calc'

// Testdata: kontant försäljning 1000 + moms 250, samt en bankkostnad 50.
const acc = (id: string, number: number, type: string, name = 'Konto', vatRate: number | null = null): AccountSum['account'] => ({
  id,
  number,
  name,
  type,
  vatRate,
})

const SAMPLE: AccountSum[] = [
  { account: acc('a', 1930, 'TILLGANG', 'Bank'), debit: 1300, credit: 0 },
  { account: acc('b', 3011, 'INTAKT', 'Försäljning', 25), debit: 0, credit: 1000 },
  { account: acc('c', 2611, 'SKULD', 'Utgående moms'), debit: 0, credit: 300 },
  { account: acc('d', 6570, 'KOSTNAD', 'Bankkostnad'), debit: 50, credit: 0 },
]

describe('computeResult', () => {
  it('räknar intäkter minus kostnader', () => {
    const r = computeResult(SAMPLE)
    expect(r.totalIncome).toBe(1000)
    expect(r.totalExpenses).toBe(50)
    expect(r.result).toBe(950)
  })
})

describe('computeBalance', () => {
  it('tar med årets resultat i eget kapital/skulder', () => {
    const b = computeBalance(SAMPLE)
    expect(b.totalAssets).toBe(1300)
    expect(b.yearResult).toBe(950)
    // EK/skulder (moms 300) + årets resultat (950) = 1250
    expect(b.totalEquityAndLiabilities).toBe(1250)
    expect(b.diff).toBe(50)
  })

  it('en komplett balanserad affärshändelse ger diff 0', () => {
    // Bank 1250 in, försäljning 1000, utgående moms 250.
    const balanced: AccountSum[] = [
      { account: acc('a', 1930, 'TILLGANG'), debit: 1250, credit: 0 },
      { account: acc('b', 3011, 'INTAKT'), debit: 0, credit: 1000 },
      { account: acc('c', 2611, 'SKULD'), debit: 0, credit: 250 },
    ]
    const b = computeBalance(balanced)
    expect(b.diff).toBe(0)
  })
})

describe('computeVat', () => {
  it('räknar utgående minus ingående moms', () => {
    const v = computeVat(SAMPLE)
    expect(v.totalOutputVat).toBe(300)
    expect(v.totalInputVat).toBe(0)
    expect(v.netVat).toBe(300)
    expect(v.salesBase).toBe(1000)
  })

  it('flaggar momsavvikelse när bokförd moms skiljer sig från förväntad', () => {
    // Försäljning 1000 @ 25% -> förväntad 250, men 300 är bokförd -> avvikelse 50.
    const v = computeVat(SAMPLE)
    expect(v.expectedOutputVat).toBe(250)
    expect(v.outputVatDeviation).toBe(50)
    expect(v.hasDeviation).toBe(true)
  })

  it('ingen avvikelse när momsen stämmer', () => {
    const ok: AccountSum[] = [
      { account: acc('b', 3011, 'INTAKT', 'Försäljning', 25), debit: 0, credit: 1000 },
      { account: acc('c', 2611, 'SKULD', 'Utgående moms'), debit: 0, credit: 250 },
    ]
    const v = computeVat(ok)
    expect(v.expectedOutputVat).toBe(250)
    expect(v.outputVatDeviation).toBe(0)
    expect(v.hasDeviation).toBe(false)
  })
})

describe('sumRange', () => {
  it('summerar kontonummerintervall med rätt tecken', () => {
    expect(sumRange(SAMPLE, 3000, 3999, 'credit')).toBe(1000)
    expect(sumRange(SAMPLE, 6000, 6999, 'debit')).toBe(50)
  })
})

describe('computeYearEnd', () => {
  it('fyller NE R-fält från kontona', () => {
    const y = computeYearEnd(SAMPLE)
    expect(y.result.momspliktigIntakter).toBe(1000)
    expect(y.result.ovrigaExternaKostnader).toBe(50)
    expect(y.result.aretsResultat).toBe(950)
    const r1 = y.ne.r.find((f) => f.code === 'R1')
    expect(r1?.amount).toBe(1000)
  })
})
