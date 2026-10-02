import { prisma } from '../../config/database'
import { CreateFiscalYearInput } from './fiscalYears.schema'

const FY_SELECT = {
  id: true,
  label: true,
  startDate: true,
  endDate: true,
  isClosed: true,
  _count: { select: { verifications: true } },
}

export async function listFiscalYears() {
  return prisma.fiscalYear.findMany({ select: FY_SELECT, orderBy: { startDate: 'desc' } })
}

export async function createFiscalYear(input: CreateFiscalYearInput) {
  const existing = await prisma.fiscalYear.findUnique({ where: { label: input.label } })
  if (existing) throw new Error('DUPLICATE_LABEL')

  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)
  if (endDate <= startDate) throw new Error('INVALID_RANGE')

  return prisma.fiscalYear.create({
    data: { label: input.label, startDate, endDate },
    select: FY_SELECT,
  })
}

// Lås räkenskapsåret (bokslut). Efter detta kan verifikationer ej ändras.
export async function closeFiscalYear(id: string) {
  const existing = await prisma.fiscalYear.findUnique({ where: { id } })
  if (!existing) throw new Error('NOT_FOUND')
  return prisma.fiscalYear.update({ where: { id }, data: { isClosed: true }, select: FY_SELECT })
}

export async function reopenFiscalYear(id: string) {
  const existing = await prisma.fiscalYear.findUnique({ where: { id } })
  if (!existing) throw new Error('NOT_FOUND')
  return prisma.fiscalYear.update({ where: { id }, data: { isClosed: false }, select: FY_SELECT })
}
