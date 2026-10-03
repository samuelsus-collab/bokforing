import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Account, AccountType } from '@/types/bokforing'

export const accountKeys = {
  all: ['accounts'] as const,
  list: (params: object) => [...accountKeys.all, 'list', params] as const,
}

interface ListParams {
  type?: AccountType
  isActive?: boolean
  search?: string
}

export function useAccounts(params: ListParams = {}) {
  return useQuery({
    queryKey: accountKeys.list(params),
    queryFn: () => api.get<{ success: boolean; data: Account[] }>('/accounts', { params }).then((r) => r.data.data),
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { number: number; name: string; type: AccountType; vatRate?: number | null; sruCode?: string | null }) =>
      api.post<{ success: boolean; data: Account }>('/accounts', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all })
      toast.success('Konto skapat')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.code === 'DUPLICATE_NUMBER' ? 'Kontonumret finns redan' : 'Kunde inte skapa konto')
    },
  })
}

type AccountPatch = Partial<{ name: string; type: AccountType; vatRate: number | null; sruCode: string | null; isActive: boolean }>

export function useUpdateAccount(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AccountPatch) =>
      api.patch<{ success: boolean; data: Account }>(`/accounts/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all })
      toast.success('Konto uppdaterat')
    },
    onError: () => toast.error('Kunde inte uppdatera konto'),
  })
}

// Uppdatera valfritt konto (id i payloaden) – praktiskt för åtgärder per rad.
export function useUpdateAccountById() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountPatch }) =>
      api.patch<{ success: boolean; data: Account }>(`/accounts/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all })
      toast.success('Konto uppdaterat')
    },
    onError: () => toast.error('Kunde inte uppdatera konto'),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all })
      toast.success('Konto borttaget')
    },
    onError: () => toast.error('Kunde inte ta bort konto'),
  })
}
