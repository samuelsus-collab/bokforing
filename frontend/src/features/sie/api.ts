import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface ImportResult {
  accountsCreated: number
  verificationsCreated: number
  openingBalanceImported: boolean
  warnings: string[]
}

export async function downloadSie(fiscalYearId: string, label: string) {
  const res = await api.get('/sie/export', { params: { fiscalYearId }, responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sie-${label}.se`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Läs fil som base64 (rå bytes) så att backend kan avkoda CP437/UTF-8.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      resolve(btoa(binary))
    }
    reader.readAsArrayBuffer(file)
  })
}

export function useImportSie() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fiscalYearId, file }: { fiscalYearId: string; file: File }) => {
      const contentBase64 = await fileToBase64(file)
      const res = await api.post<{ success: boolean; data: ImportResult }>('/sie/import', { fiscalYearId, contentBase64 })
      return res.data.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['verifications'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success(`Import klar: ${data.verificationsCreated} verifikationer, ${data.accountsCreated} nya konton`)
    },
    onError: (err: any) => {
      const code = err?.response?.data?.error?.code
      const message = err?.response?.data?.error?.message
      if (code === 'IMPORT_UNBALANCED') toast.error(message || 'En verifikation balanserar inte – inget importerades')
      else if (code === 'FISCAL_YEAR_CLOSED') toast.error('Räkenskapsåret är låst')
      else toast.error('Kunde inte importera SIE-filen')
    },
  })
}
