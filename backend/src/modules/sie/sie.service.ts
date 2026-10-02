import { Prisma, AccountType } from '@prisma/client'
import { prisma } from '../../config/database'

// ─── Teckenkodning ───────────────────────────────────────────────────────────
// SIE-filer är historiskt kodade i PC8 (IBM CP437). Moderna program kan använda
// UTF-8. Vi provar UTF-8 först och faller tillbaka på CP437.
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '

export function decodeSie(buf: Buffer): string {
  const utf8 = buf.toString('utf8')
  if (!utf8.includes('�')) return utf8
  const latin = buf.toString('latin1')
  let out = ''
  for (const ch of latin) {
    const c = ch.charCodeAt(0)
    out += c >= 0x80 ? CP437_HIGH[c - 0x80] ?? ch : ch
  }
  return out
}

// ─── Kontotyp från kontonummer (BAS) ─────────────────────────────────────────
export function accountTypeForNumber(n: number): AccountType {
  if (n < 2000) return 'TILLGANG'
  if (n < 2100) return 'EGET_KAPITAL'
  if (n < 3000) return 'SKULD'
  if (n < 4000) return 'INTAKT'
  if (n >= 8300 && n < 8400) return 'INTAKT'
  return 'KOSTNAD'
}

function ktypFor(type: AccountType): string {
  switch (type) {
    case 'TILLGANG':
      return 'T'
    case 'SKULD':
    case 'EGET_KAPITAL':
      return 'S'
    case 'INTAKT':
      return 'I'
    case 'KOSTNAD':
      return 'K'
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(',', '.'))
}

function sieDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function parseSieDate(s: string): Date {
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(4, 6))
  const d = Number(s.slice(6, 8))
  return new Date(Date.UTC(y, m - 1, d))
}

// Dela en SIE-rad i tokens, respektera citattecken.
function tokenize(line: string): string[] {
  const res: string[] = []
  let i = 0
  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i])) i++
    if (i >= line.length) break
    if (line[i] === '"') {
      i++
      let s = ''
      while (i < line.length && line[i] !== '"') {
        s += line[i]
        i++
      }
      i++
      res.push(s)
    } else {
      let s = ''
      while (i < line.length && !/\s/.test(line[i])) {
        s += line[i]
        i++
      }
      res.push(s)
    }
  }
  return res
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export interface ParsedTrans {
  account: number
  amount: number // debet positiv, kredit negativ
  date?: string
  text?: string
}
export interface ParsedVer {
  series?: string
  vernum?: string
  date: string
  text: string
  rows: ParsedTrans[]
}
export interface ParsedSie {
  company?: string
  orgNumber?: string
  accounts: { number: number; name: string }[]
  ib: { account: number; amount: number }[]
  vers: ParsedVer[]
}

export function parseSie(content: string): ParsedSie {
  const accounts: { number: number; name: string }[] = []
  const ib: { account: number; amount: number }[] = []
  const vers: ParsedVer[] = []
  let company: string | undefined
  let orgNumber: string | undefined

  let current: ParsedVer | null = null
  let inBlock = false

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const t = tokenize(line)
    const tag = t[0]

    if (tag === '#FNAMN') company = t[1]
    else if (tag === '#ORGNR') orgNumber = t[1]
    else if (tag === '#KONTO') accounts.push({ number: Number(t[1]), name: t[2] ?? `Konto ${t[1]}` })
    else if (tag === '#IB') {
      // #IB årsnr konto saldo — endald innevarande år (0).
      if (Number(t[1]) === 0) ib.push({ account: Number(t[2]), amount: parseAmount(t[3]) })
    } else if (tag === '#VER') {
      current = { series: t[1], vernum: t[2], date: t[3], text: t[4] ?? '', rows: [] }
      if (t[t.length - 1] === '{') inBlock = true
    } else if (tag === '{') {
      inBlock = true
    } else if (tag === '}') {
      if (current) vers.push(current)
      current = null
      inBlock = false
    } else if (tag === '#TRANS' && current && inBlock) {
      // #TRANS konto {objektlista} belopp [transdat] [transtext]
      const account = Number(t[1])
      // Hitta beloppet: första numeriska token efter kontot (hoppar över {..}).
      let amount = NaN
      let idx = 2
      for (; idx < t.length; idx++) {
        if (/^-?\d+[.,]?\d*$/.test(t[idx])) {
          amount = parseAmount(t[idx])
          break
        }
      }
      if (!Number.isNaN(amount)) {
        current.rows.push({ account, amount })
      }
    }
  }

  return { company, orgNumber, accounts, ib, vers }
}

// ─── Import ────────────────────────────────────────────────────────────────

export interface ImportResult {
  accountsCreated: number
  verificationsCreated: number
  openingBalanceImported: boolean
  warnings: string[]
}

export async function importSie(fiscalYearId: string, content: string): Promise<ImportResult> {
  const parsed = parseSie(content)

  return prisma.$transaction(async (tx) => {
    const fy = await tx.fiscalYear.findUnique({ where: { id: fiscalYearId } })
    if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')
    if (fy.isClosed) throw new Error('FISCAL_YEAR_CLOSED')

    const warnings: string[] = []

    // Samla alla kontonummer som förekommer (från #KONTO, #TRANS och #IB).
    const nameByNumber = new Map<number, string>()
    for (const a of parsed.accounts) nameByNumber.set(a.number, a.name)
    const referenced = new Set<number>()
    for (const v of parsed.vers) for (const r of v.rows) referenced.add(r.account)
    for (const b of parsed.ib) referenced.add(b.account)
    for (const a of parsed.accounts) referenced.add(a.number)

    // Skapa konton som saknas.
    const existing = await tx.account.findMany({ select: { id: true, number: true } })
    const idByNumber = new Map(existing.map((a) => [a.number, a.id]))
    let accountsCreated = 0
    for (const number of referenced) {
      if (!idByNumber.has(number)) {
        const created = await tx.account.create({
          data: {
            number,
            name: nameByNumber.get(number) ?? `Konto ${number}`,
            type: accountTypeForNumber(number),
          },
          select: { id: true, number: true },
        })
        idByNumber.set(number, created.id)
        accountsCreated++
      }
    }

    // Nästa verifikationsnummer i den obrutna serien.
    const agg = await tx.verification.aggregate({ where: { fiscalYearId }, _max: { number: true } })
    let next = (agg._max.number ?? 0) + 1

    const makeRows = (items: { account: number; amount: number }[]) =>
      items.map((r, i) => ({
        accountId: idByNumber.get(r.account)!,
        debit: new Prisma.Decimal((r.amount > 0 ? r.amount : 0).toFixed(2)),
        credit: new Prisma.Decimal((r.amount < 0 ? -r.amount : 0).toFixed(2)),
        sortOrder: i,
      }))

    // Ingående balanser → en verifikation vid räkenskapsårets början.
    let openingBalanceImported = false
    if (parsed.ib.length > 0) {
      const sum = round2(parsed.ib.reduce((a, b) => a + b.amount, 0))
      if (sum === 0) {
        await tx.verification.create({
          data: {
            number: next++,
            fiscalYearId,
            date: fy.startDate,
            description: 'Ingående balanser',
            rows: { create: makeRows(parsed.ib) },
          },
        })
        openingBalanceImported = true
      } else {
        warnings.push(`Ingående balanser hoppades över (obalans ${sum.toFixed(2)}).`)
      }
    }

    // Verifikationer, sorterade på datum.
    const sorted = [...parsed.vers].sort((a, b) => a.date.localeCompare(b.date))
    let verificationsCreated = 0
    for (const v of sorted) {
      const sum = round2(v.rows.reduce((a, r) => a + r.amount, 0))
      const gross = round2(v.rows.reduce((a, r) => a + Math.abs(r.amount), 0))
      if (v.rows.length < 2 || gross === 0) {
        warnings.push(`Verifikation "${v.text}" (${v.date}) hoppades över – saknar rader/belopp.`)
        continue
      }
      if (sum !== 0) {
        throw new Error(`IMPORT_UNBALANCED:${v.series ?? ''} ${v.vernum ?? ''} ${v.date} (diff ${sum.toFixed(2)})`)
      }
      await tx.verification.create({
        data: {
          number: next++,
          fiscalYearId,
          date: parseSieDate(v.date),
          description: v.text || 'Importerad verifikation',
          rows: { create: makeRows(v.rows) },
        },
      })
      verificationsCreated++
    }

    return { accountsCreated, verificationsCreated, openingBalanceImported, warnings }
  })
}

// ─── Export ────────────────────────────────────────────────────────────────

export async function exportSie(fiscalYearId: string): Promise<string> {
  const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } })
  if (!fy) throw new Error('FISCAL_YEAR_NOT_FOUND')
  const company = await prisma.company.findFirst()
  const accounts = await prisma.account.findMany({ orderBy: { number: 'asc' } })
  const vers = await prisma.verification.findMany({
    where: { fiscalYearId },
    orderBy: { number: 'asc' },
    include: { rows: { include: { account: true }, orderBy: { sortOrder: 'asc' } } },
  })

  const lines: string[] = []
  lines.push('#FLAGGA 0')
  lines.push('#PROGRAM "Bokföring" 1.0')
  lines.push('#FORMAT PC8')
  lines.push(`#GEN ${sieDate(new Date())}`)
  lines.push('#SIETYP 4')
  if (company?.name) lines.push(`#FNAMN "${company.name}"`)
  if (company?.orgNumber) lines.push(`#ORGNR ${company.orgNumber.replace(/[-\s]/g, '')}`)
  lines.push(`#RAR 0 ${sieDate(fy.startDate)} ${sieDate(fy.endDate)}`)

  for (const a of accounts) {
    lines.push(`#KONTO ${a.number} "${a.name}"`)
    lines.push(`#KTYP ${a.number} ${ktypFor(a.type)}`)
  }

  for (const v of vers) {
    lines.push(`#VER "A" "${v.number}" ${sieDate(new Date(v.date))} "${v.description.replace(/"/g, "'")}"`)
    lines.push('{')
    for (const r of v.rows) {
      const amount = Number(r.debit) - Number(r.credit)
      lines.push(`   #TRANS ${r.account.number} {} ${amount.toFixed(2)}`)
    }
    lines.push('}')
  }

  // Obs: exporten är UTF-8-kodad (trots #FORMAT PC8). Importören här hanterar båda.
  return lines.join('\r\n') + '\r\n'
}
