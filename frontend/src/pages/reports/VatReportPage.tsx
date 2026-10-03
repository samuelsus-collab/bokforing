import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReportSection } from '@/components/common/ReportSection'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { useVatReport } from '@/features/reports/api'
import { formatSEK, cn } from '@/lib/utils'

export function VatReportPage() {
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')

  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useVatReport({ fiscalYearId })

  return (
    <div>
      <PageHeader
        title="Momsrapport"
        description="Utgående minus ingående moms för perioden (kontantmetoden) – underlag för skattedeklarationen."
      />

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
          {/* Momskontroll: jämför bokförd utgående moms med förväntad (försäljning × momssats). */}
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              data.hasDeviation ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-primary-100 bg-primary-50 text-primary-800'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {data.hasDeviation ? '⚠️ Momsavvikelse upptäckt' : '✓ Momsen stämmer'}
              </span>
              <span className="tabular-nums">Avvikelse: {formatSEK(data.outputVatDeviation)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <span>Förväntad utgående moms: <strong>{formatSEK(data.expectedOutputVat)}</strong></span>
              <span>Bokförd utgående moms: <strong>{formatSEK(data.totalOutputVat)}</strong></span>
            </div>
            {data.hasDeviation && (
              <p className="mt-2 text-xs">
                Den bokförda utgående momsen skiljer sig från vad försäljningen borde ge. Kontrollera att rätt momssats
                använts och att moms bokförts på all momspliktig försäljning. (Avvikelse kan också bero på omvänd
                skattskyldighet eller öresavrundning.)
              </p>
            )}
          </div>

          <div className="card flex items-center justify-between px-5 py-4">
            <span className="text-gray-600">Momspliktig försäljning (exkl. moms)</span>
            <span className="tabular-nums font-medium">{formatSEK(data.salesBase)}</span>
          </div>

          <ReportSection
            title="Utgående moms (på försäljning)"
            lines={data.outputVat}
            total={data.totalOutputVat}
            totalLabel="Summa utgående moms"
            emptyText="Ingen utgående moms i perioden"
          />
          <ReportSection
            title="Ingående moms (på inköp)"
            lines={data.inputVat}
            total={data.totalInputVat}
            totalLabel="Summa ingående moms"
            emptyText="Ingen ingående moms i perioden"
          />

          <div
            className={cn(
              'card flex items-center justify-between px-5 py-4 text-lg font-semibold',
              data.netVat >= 0 ? 'text-primary-700' : 'text-red-600'
            )}
          >
            <span>{data.netVat >= 0 ? 'Moms att betala' : 'Moms att få tillbaka'}</span>
            <span className="tabular-nums">{formatSEK(Math.abs(data.netVat))}</span>
          </div>
        </div>
      )}
    </div>
  )
}
