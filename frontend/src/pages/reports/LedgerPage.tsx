import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { useAccounts } from '@/features/accounts/api'
import { useLedgerReport } from '@/features/reports/api'
import { formatSEK, formatDate } from '@/lib/utils'

export function LedgerPage() {
  const { data: years } = useFiscalYears()
  const { data: accounts } = useAccounts({ isActive: true })
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useLedgerReport({ fiscalYearId, accountId })

  return (
    <div>
      <PageHeader title="Huvudbok" description="Alla bokförda transaktioner för ett konto med löpande saldo." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input max-w-[160px]" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
          {years?.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <select className="input max-w-sm" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Välj konto…</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.number} · {a.name}
            </option>
          ))}
        </select>
      </div>

      {!accountId ? (
        <EmptyState title="Välj ett konto" description="Välj ett konto ovan för att se dess huvudbok." />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-x-auto">
          <div className="border-b border-surface-border bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            {data.account.number} · {data.account.name}
          </div>
          {data.entries.length === 0 ? (
            <EmptyState title="Inga transaktioner" description="Kontot har inga bokförda transaktioner i perioden." />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ver</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Text</th>
                  <th className="px-4 py-3 text-right">Debet</th>
                  <th className="px-4 py-3 text-right">Kredit</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.entries.map((e, i) => (
                  <tr key={`${e.verificationId}-${i}`}>
                    <td className="px-4 py-2 font-mono">{e.number}</td>
                    <td className="px-4 py-2 text-gray-600">{formatDate(e.date)}</td>
                    <td className="px-4 py-2">{e.rowDescription || e.description}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{e.debit ? formatSEK(e.debit) : ''}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{e.credit ? formatSEK(e.credit) : ''}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{formatSEK(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-surface-border bg-gray-50 font-semibold">
                <tr>
                  <td className="px-4 py-2" colSpan={3}>
                    Summa / utgående saldo
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSEK(data.totalDebit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSEK(data.totalCredit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSEK(data.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
