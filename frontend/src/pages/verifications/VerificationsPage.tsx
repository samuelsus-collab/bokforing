import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { useVerifications } from '@/features/verifications/api'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { formatDate, formatSEK, sumAmount } from '@/lib/utils'

export function VerificationsPage() {
  const navigate = useNavigate()
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Förvald: senaste räkenskapsåret.
  const effectiveFyId = fiscalYearId || years?.[0]?.id || ''

  const { data, isLoading } = useVerifications({
    fiscalYearId: effectiveFyId || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const rows = data?.data ?? []
  const meta = data?.meta

  const yearLabel = useMemo(
    () => years?.find((y) => y.id === effectiveFyId)?.label,
    [years, effectiveFyId]
  )

  return (
    <div>
      <PageHeader
        title="Verifikationer"
        description={yearLabel ? `Räkenskapsår ${yearLabel}` : undefined}
        actions={
          <button className="btn-primary" onClick={() => navigate('/verifikationer/ny')}>
            <Plus size={16} /> Ny verifikation
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="input max-w-[200px]"
          value={effectiveFyId}
          onChange={(e) => {
            setFiscalYearId(e.target.value)
            setPage(1)
          }}
        >
          {years?.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <input
          className="input max-w-xs"
          placeholder="Sök text eller nummer…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <EmptyState title="Inga verifikationer" description="Bokför din första verifikation." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nr</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Text</th>
                <th className="px-4 py-3 text-right">Belopp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((v) => (
                <tr
                  key={v.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/verifikationer/${v.id}`)}
                >
                  <td className="px-4 py-2 font-mono">{v.number}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(v.date)}</td>
                  <td className="px-4 py-2">{v.description}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSEK(sumAmount(v.rows, 'debit'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {meta.total} verifikationer · sida {meta.page} av {meta.pageCount}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Föregående
            </button>
            <button className="btn-secondary" disabled={page >= meta.pageCount} onClick={() => setPage((p) => p + 1)}>
              Nästa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
