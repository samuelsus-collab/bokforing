import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ReportLine {
  accountId: string
  number: number
  name: string
  amount: number
}

export interface ResultReport {
  fiscalYear: { id: string; label: string }
  income: ReportLine[]
  expenses: ReportLine[]
  totalIncome: number
  totalExpenses: number
  result: number
}

export interface BalanceReport {
  fiscalYear: { id: string; label: string }
  assets: ReportLine[]
  equityAndLiabilities: ReportLine[]
  yearResult: number
  totalAssets: number
  totalEquityAndLiabilities: number
  diff: number
}

export interface VatReport {
  fiscalYear: { id: string; label: string }
  salesBase: number
  outputVat: ReportLine[]
  inputVat: ReportLine[]
  totalOutputVat: number
  totalInputVat: number
  netVat: number
}

export interface NeField {
  code: string
  label: string
  amount: number
}

export interface YearEndReport {
  fiscalYear: { id: string; label: string; isClosed: boolean }
  result: {
    momspliktigIntakter: number
    ovrigaIntakter: number
    finansiellaIntakter: number
    varukostnader: number
    ovrigaExternaKostnader: number
    personalkostnader: number
    finansiellaKostnader: number
    totalaIntakter: number
    totalaKostnader: number
    aretsResultat: number
  }
  balance: BalanceReport
  ne: { r: NeField[]; b: NeField[] }
}

export const reportKeys = {
  all: ['reports'] as const,
  result: (params: object) => [...reportKeys.all, 'result', params] as const,
  balance: (params: object) => [...reportKeys.all, 'balance', params] as const,
  vat: (params: object) => [...reportKeys.all, 'vat', params] as const,
  yearEnd: (params: object) => [...reportKeys.all, 'year-end', params] as const,
}

interface Params {
  fiscalYearId?: string
  from?: string
  to?: string
}

export function useResultReport(params: Params) {
  return useQuery({
    queryKey: reportKeys.result(params),
    queryFn: () => api.get<{ success: boolean; data: ResultReport }>('/reports/result', { params }).then((r) => r.data.data),
    enabled: !!params.fiscalYearId,
  })
}

export function useBalanceReport(params: Params) {
  return useQuery({
    queryKey: reportKeys.balance(params),
    queryFn: () => api.get<{ success: boolean; data: BalanceReport }>('/reports/balance', { params }).then((r) => r.data.data),
    enabled: !!params.fiscalYearId,
  })
}

export function useVatReport(params: Params) {
  return useQuery({
    queryKey: reportKeys.vat(params),
    queryFn: () => api.get<{ success: boolean; data: VatReport }>('/reports/vat', { params }).then((r) => r.data.data),
    enabled: !!params.fiscalYearId,
  })
}

export function useYearEndReport(params: Params) {
  return useQuery({
    queryKey: reportKeys.yearEnd(params),
    queryFn: () => api.get<{ success: boolean; data: YearEndReport }>('/reports/year-end', { params }).then((r) => r.data.data),
    enabled: !!params.fiscalYearId,
  })
}
