import { describe, it, expect } from 'vitest'
import { parseSie, accountTypeForNumber, decodeSie } from './sie.service'

const SAMPLE = `#FLAGGA 0
#PROGRAM "Testprogram" 1.0
#FORMAT PC8
#SIETYP 4
#FNAMN "Min Firma"
#ORGNR 1234567890
#RAR 0 20250101 20251231
#KONTO 1930 "Företagskonto"
#KTYP 1930 T
#KONTO 3011 "Försäljning"
#KONTO 2611 "Utgående moms"
#IB 0 1930 5000.00
#IB 0 2010 -5000.00
#VER "A" "1" 20250310 "Kontant försäljning"
{
   #TRANS 1930 {} 1250.00
   #TRANS 3011 {} -1000.00
   #TRANS 2611 {} -250.00
}
`

describe('parseSie', () => {
  it('läser konton, ingående balanser och verifikationer', () => {
    const p = parseSie(SAMPLE)
    expect(p.company).toBe('Min Firma')
    expect(p.accounts).toHaveLength(3)
    expect(p.ib).toHaveLength(2)
    expect(p.vers).toHaveLength(1)
    const v = p.vers[0]
    expect(v.text).toBe('Kontant försäljning')
    expect(v.date).toBe('20250310')
    expect(v.rows).toHaveLength(3)
    // Summan av beloppen ska vara 0 (balanserad verifikation).
    expect(v.rows.reduce((a, r) => a + r.amount, 0)).toBeCloseTo(0, 2)
    expect(v.rows[0]).toEqual({ account: 1930, amount: 1250 })
  })

  it('accepterar både komma och punkt som decimaltecken', () => {
    const p = parseSie('#VER "A" "1" 20250101 "X"\n{\n#TRANS 1930 {} 10,50\n#TRANS 3011 {} -10,50\n}\n')
    expect(p.vers[0].rows[0].amount).toBeCloseTo(10.5, 2)
  })
})

describe('accountTypeForNumber', () => {
  it('klassificerar enligt BAS-intervall', () => {
    expect(accountTypeForNumber(1930)).toBe('TILLGANG')
    expect(accountTypeForNumber(2010)).toBe('EGET_KAPITAL')
    expect(accountTypeForNumber(2611)).toBe('SKULD')
    expect(accountTypeForNumber(3011)).toBe('INTAKT')
    expect(accountTypeForNumber(5010)).toBe('KOSTNAD')
    expect(accountTypeForNumber(8310)).toBe('INTAKT')
    expect(accountTypeForNumber(8410)).toBe('KOSTNAD')
  })
})

describe('decodeSie', () => {
  it('avkodar CP437 (å ä ö)', () => {
    // CP437: å=0x86, ä=0x84, ö=0x94
    const buf = Buffer.from([0x86, 0x84, 0x94])
    expect(decodeSie(buf)).toBe('åäö')
  })
  it('avkodar UTF-8 rakt av', () => {
    expect(decodeSie(Buffer.from('Räkenskapsår', 'utf8'))).toBe('Räkenskapsår')
  })
})
