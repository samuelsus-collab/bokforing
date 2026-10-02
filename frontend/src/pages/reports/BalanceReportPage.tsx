import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReportSection } from '@/components/common/ReportSection'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { useBalanceReport } from '@/features/reports/api'
import { formatSEK } from '@/lib/utils'

export function BalanceReportPage() {
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')

  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useBalanceReport({ fiscalYearId })

  // Eget kapital & skulder visas med årets resultat som egen post.
  const eqLines = data
    ? [...data.equityAndLiabilities, { accountId: '__result__', number: 0, name: 'Årets resultat', amount: data.yearResult }]
    : []

  return (
    <div>
      <PageHeader title="Balansrapport" description="Tillgångar samt eget kapital och skulder vid räkenskapsårets slut." />

      <div className="mb-4">
        <select className="input max-w-[200px]" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
          {years?.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <ReportSection title="Tillgångar" lines={data.assets} total={data.totalAssets} totalLabel="Summa tillgångar" />
          <ReportSection
            title="Eget kapital och skulder"
            lines={eqLines}
            total={data.totalEquityAndLiabilities}
            totalLabel="Summa eget kapital och skulder"
          />

          {data.diff !== 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Balansen går inte ihop – differens {formatSEK(data.diff)}. Kontrollera verifikationerna.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
