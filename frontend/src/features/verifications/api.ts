import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { PaginatedResponse, Verification, VerificationListItem } from '@/types/bokforing'

export const verificationKeys = {
  all: ['verifications'] as const,
  list: (params: object) => [...verificationKeys.all, 'list', params] as const,
  detail: (id: string) => [...verificationKeys.all, id] as const,
}

export interface RowInput {
  accountId: string
  debit: number
  credit: number
  description?: string
}

interface ListParams {
  page?: number
  pageSize?: number
  fiscalYearId?: string
  from?: string
  to?: string
  search?: string
}

export function useVerifications(params: ListParams = {}) {
  return useQuery({
    queryKey: verificationKeys.list(params),
    queryFn: () => api.get<PaginatedResponse<VerificationListItem>>('/verifications', { params }).then((r) => r.data),
  })
}

export function useVerification(id: string) {
  return useQuery({
    queryKey: verificationKeys.detail(id),
    queryFn: () => api.get<{ success: boolean; data: Verification }>(`/verifications/${id}`).then((r) => r.data.data),
    enabled: !!id && id !== 'new',
  })
}

interface SavePayload {
  fiscalYearId: string
  date: string
  description: string
  rows: RowInput[]
}

const ERROR_MESSAGES: Record<string, string> = {
  UNBALANCED: 'Debet och kredit måste balansera',
  EMPTY_AMOUNT: 'Verifikationen saknar belopp',
  FISCAL_YEAR_CLOSED: 'Räkenskapsåret är låst',
  ACCOUNT_NOT_FOUND: 'Ett valt konto finns inte',
  DATE_OUTSIDE_FISCAL_YEAR: 'Datumet ligger utanför räkenskapsåret',
}

function toastError(err: any, fallback: string) {
  const code = err?.response?.data?.error?.code
  toast.error(ERROR_MESSAGES[code] ?? fallback)
}

export function useCreateVerification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SavePayload) =>
      api.post<{ success: boolean; data: Verification }>('/verifications', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: verificationKeys.all })
      toast.success('Verifikation bokförd')
    },
    onError: (err) => toastError(err, 'Kunde inte bokföra verifikationen'),
  })
}

export function useUpdateVerification(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SavePayload>) =>
      api.patch<{ success: boolean; data: Verification }>(`/verifications/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: verificationKeys.all })
      toast.success('Verifikation uppdaterad')
    },
    onError: (err) => toastError(err, 'Kunde inte uppdatera verifikationen'),
  })
}

export function useDeleteVerification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/verifications/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: verificationKeys.all })
      toast.success('Verifikation borttagen')
    },
    onError: (err) => toastError(err, 'Kunde inte ta bort verifikationen'),
  })
}
