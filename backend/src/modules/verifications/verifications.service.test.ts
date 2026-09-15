import { describe, it, expect } from 'vitest'
import { assertBalanced } from './verifications.service'

describe('assertBalanced', () => {
  it('godkänner en balanserad verifikation', () => {
    const rows = [
      { debit: 1250, credit: 0 }, // 1930 Bank
      { debit: 0, credit: 1000 }, // 3011 Försäljning
      { debit: 0, credit: 250 }, // 2611 Utgående moms
    ]
    const totals = assertBalanced(rows)
    expect(totals.debitTotal).toBe(1250)
    expect(totals.creditTotal).toBe(1250)
  })

  it('kastar UNBALANCED när debet och kredit skiljer sig', () => {
    const rows = [
      { debit: 1250, credit: 0 },
      { debit: 0, credit: 1000 },
    ]
    expect(() => assertBalanced(rows)).toThrowError('UNBALANCED')
  })

  it('kastar EMPTY_AMOUNT när allt är noll', () => {
    const rows = [
      { debit: 0, credit: 0 },
      { debit: 0, credit: 0 },
    ]
    expect(() => assertBalanced(rows)).toThrowError('EMPTY_AMOUNT')
  })

  it('hanterar ören utan flyttalsfel', () => {
    const rows = [
      { debit: 0.1 + 0.2, credit: 0 }, // 0.30000000000000004 i flyttal
      { debit: 0, credit: 0.3 },
    ]
    expect(() => assertBalanced(rows)).not.toThrow()
  })
})
