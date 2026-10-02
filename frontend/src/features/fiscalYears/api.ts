import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { FiscalYear } from '@/types/bokforing'

export const fiscalYearKeys = {
  all: ['fiscal-years'] as const,
}

export function useFiscalYears() {
  return useQuery({
    queryKey: fiscalYearKeys.all,
    queryFn: () => api.get<{ success: boolean; data: FiscalYear[] }>('/fiscal-years').then((r) => r.data.data),
  })
}

export function useCreateFiscalYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; startDate: string; endDate: string }) =>
      api.post<{ success: boolean; data: FiscalYear }>('/fiscal-years', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fiscalYearKeys.all })
      toast.success('Räkenskapsår skapat')
    },
    onError: () => toast.error('Kunde inte skapa räkenskapsår'),
  })
}

export function useSetFiscalYearClosed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, close }: { id: string; close: boolean }) =>
      api.post<{ success: boolean; data: FiscalYear }>(`/fiscal-years/${id}/${close ? 'close' : 'reopen'}`).then((r) => r.data.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: fiscalYearKeys.all })
      toast.success(vars.close ? 'Bokslut klart – räkenskapsåret är låst' : 'Räkenskapsåret är öppnat igen')
    },
    onError: () => toast.error('Kunde inte ändra räkenskapsårets status'),
  })
}
