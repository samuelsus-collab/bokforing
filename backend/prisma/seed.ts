import 'dotenv/config'
import { PrismaClient, Prisma, AccountType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Avskalad BAS-kontoplan anpassad för enskild firma, kontantmetoden, inga anställda.
type SeedAccount = { number: number; name: string; type: AccountType; vatRate?: number; sruCode?: string }

const ACCOUNTS: SeedAccount[] = [
  // Tillgångar (1xxx)
  { number: 1630, name: 'Skattekonto', type: 'TILLGANG' },
  { number: 1910, name: 'Kassa', type: 'TILLGANG' },
  { number: 1930, name: 'Företagskonto / bank', type: 'TILLGANG' },
  { number: 1510, name: 'Kundfordringar', type: 'TILLGANG' },

  // Eget kapital (2xxx)
  { number: 2010, name: 'Eget kapital', type: 'EGET_KAPITAL' },
  { number: 2013, name: 'Egna uttag', type: 'EGET_KAPITAL' },
  { number: 2018, name: 'Egna insättningar', type: 'EGET_KAPITAL' },

  // Skulder / moms (2xxx)
  { number: 2440, name: 'Leverantörsskulder', type: 'SKULD' },
  { number: 2611, name: 'Utgående moms 25 %', type: 'SKULD', vatRate: 25 },
  { number: 2641, name: 'Ingående moms', type: 'SKULD', vatRate: 25 },
  { number: 2650, name: 'Redovisningskonto för moms', type: 'SKULD' },

  // Intäkter (3xxx)
  { number: 3011, name: 'Försäljning tjänster 25 % moms', type: 'INTAKT', vatRate: 25, sruCode: '7410' },
  { number: 3041, name: 'Försäljning varor 25 % moms', type: 'INTAKT', vatRate: 25, sruCode: '7410' },
  { number: 3740, name: 'Öres- och kronutjämning', type: 'INTAKT' },

  // Kostnader (4xxx–7xxx)
  { number: 4010, name: 'Inköp material och varor', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 5010, name: 'Lokalhyra', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 5460, name: 'Förbrukningsmaterial', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 5611, name: 'Drivmedel', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 5910, name: 'Annonsering', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 6110, name: 'Kontorsmateriel', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 6212, name: 'Mobiltelefon och telefoni', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 6540, name: 'IT-tjänster', type: 'KOSTNAD', vatRate: 25, sruCode: '7511' },
  { number: 6570, name: 'Bankkostnader', type: 'KOSTNAD', sruCode: '7511' },

  // Finansiellt (8xxx)
  { number: 8310, name: 'Ränteintäkter', type: 'INTAKT' },
  { number: 8410, name: 'Räntekostnader', type: 'KOSTNAD' },
]

async function main() {
  console.log('🌱 Seedar bokföringsdatabasen...')

  // Företag (enskild firma)
  const companyName = process.env.SEED_COMPANY_NAME ?? 'Min Enskilda Firma'
  await prisma.company.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      name: companyName,
      currency: 'SEK',
    },
  })
  console.log('✅ Företag')

  // Första användaren
  const email = process.env.SEED_USER_EMAIL ?? 'admin@firma.se'
  const password = process.env.SEED_USER_PASSWORD ?? 'bokfor123'
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Administratör', role: 'ADMIN' },
  })
  console.log(`✅ Användare (${email})`)

  // Kontoplan
  for (const a of ACCOUNTS) {
    await prisma.account.upsert({
      where: { number: a.number },
      update: { name: a.name, type: a.type },
      create: {
        number: a.number,
        name: a.name,
        type: a.type,
        vatRate: a.vatRate != null ? new Prisma.Decimal(a.vatRate.toFixed(2)) : null,
        sruCode: a.sruCode ?? null,
      },
    })
  }
  console.log(`✅ Kontoplan (${ACCOUNTS.length} konton)`)

  // Aktuellt räkenskapsår (kalenderår)
  const y = new Date().getFullYear()
  await prisma.fiscalYear.upsert({
    where: { label: String(y) },
    update: {},
    create: {
      label: String(y),
      startDate: new Date(Date.UTC(y, 0, 1)),
      endDate: new Date(Date.UTC(y, 11, 31)),
    },
  })
  console.log(`✅ Räkenskapsår ${y}`)

  console.log('🎉 Klart!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
