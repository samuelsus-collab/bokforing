import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReportSection } from '@/components/common/ReportSection'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { useResultReport } from '@/features/reports/api'
import { formatSEK, cn } from '@/lib/utils'

export function ResultReportPage() {
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')

  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useResultReport({ fiscalYearId })

  return (
    <div>
      <PageHeader title="Resultatrapport" description="Intäkter minus kostnader för räkenskapsåret (kontantmetoden)." />

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
          <ReportSection title="Intäkter" lines={data.income} total={data.totalIncome} totalLabel="Summa intäkter" />
          <ReportSection title="Kostnader" lines={data.expenses} total={data.totalExpenses} totalLabel="Summa kostnader" />

          <div className={cn('card flex items-center justify-between px-5 py-4 text-lg font-semibold', data.result >= 0 ? 'text-primary-700' : 'text-red-600')}>
            <span>Beräknat resultat</span>
            <span className="tabular-nums">{formatSEK(data.result)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
