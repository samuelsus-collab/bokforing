export type AccountType = 'TILLGANG' | 'SKULD' | 'EGET_KAPITAL' | 'INTAKT' | 'KOSTNAD'

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  TILLGANG: 'Tillgång',
  SKULD: 'Skuld',
  EGET_KAPITAL: 'Eget kapital',
  INTAKT: 'Intäkt',
  KOSTNAD: 'Kostnad',
}

// Monetära värden serialiseras som string av Prisma Decimal.
export interface Account {
  id: string
  number: number
  name: string
  type: AccountType
  vatRate: string | null
  sruCode: string | null
  isActive: boolean
}

export interface FiscalYear {
  id: string
  label: string
  startDate: string
  endDate: string
  isClosed: boolean
  _count?: { verifications: number }
}

export interface VerificationRow {
  id: string
  debit: string
  credit: string
  description: string | null
  sortOrder: number
  account: { id: string; number: number; name: string; type: AccountType }
}

export interface VerificationListItem {
  id: string
  number: number
  date: string
  description: string
  createdAt: string
  fiscalYear: { id: string; label: string; isClosed: boolean }
  rows: { debit: string; credit: string }[]
}

export interface Verification extends Omit<VerificationListItem, 'rows'> {
  updatedAt: string
  rows: VerificationRow[]
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: { total: number; page: number; pageSize: number; pageCount: number }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}
