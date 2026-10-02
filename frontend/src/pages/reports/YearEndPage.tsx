import { useEffect, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ReportSection } from '@/components/common/ReportSection'
import { useFiscalYears, useSetFiscalYearClosed } from '@/features/fiscalYears/api'
import { useYearEndReport, type NeField } from '@/features/reports/api'
import { formatSEK, cn } from '@/lib/utils'

function Row({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-2', strong && 'font-semibold')}>
      <span>{label}</span>
      <span className="tabular-nums">{formatSEK(amount)}</span>
    </div>
  )
}

function NeTable({ title, fields }: { title: string; fields: NeField[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-surface-border">
          {fields.map((f) => (
            <tr key={f.code}>
              <td className="w-16 px-4 py-2 font-mono text-gray-500">{f.code}</td>
              <td className="px-4 py-2">{f.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatSEK(f.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function YearEndPage() {
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')
  const setClosed = useSetFiscalYearClosed()

  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useYearEndReport({ fiscalYearId })
  const isClosed = data?.fiscalYear.isClosed

  return (
    <div>
      <PageHeader
        title="Förenklat årsbokslut"
        description="K1 för enskild firma: förenklad resultat- och balansräkning samt underlag till NE-bilagan."
        actions={
          data && (
            <button
              className={isClosed ? 'btn-secondary' : 'btn-primary'}
              disabled={setClosed.isPending}
              onClick={() => setClosed.mutate({ id: data.fiscalYear.id, close: !isClosed })}
            >
              {isClosed ? <LockOpen size={16} /> : <Lock size={16} />}
              {isClosed ? 'Öppna räkenskapsåret' : 'Lås (bokslut klart)'}
            </button>
          )
        }
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
        <div className="space-y-8">
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              isClosed ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-primary-100 bg-primary-50 text-primary-700'
            )}
          >
            {isClosed
              ? 'Räkenskapsåret är låst – bokslutet är klart och verifikationer kan inte ändras.'
              : 'Räkenskapsåret är öppet. Lås det när bokslutet är klart för att förhindra ändringar.'}
          </div>

          {/* Förenklad resultaträkning */}
          <div className="card overflow-hidden">
            <div className="border-b border-surface-border bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
              Resultaträkning
            </div>
            <div className="divide-y divide-surface-border">
              <Row label="Momspliktiga intäkter" amount={data.result.momspliktigIntakter} />
              <Row label="Övriga/momsfria intäkter" amount={data.result.ovrigaIntakter} />
              <Row label="Ränteintäkter m.m." amount={data.result.finansiellaIntakter} />
              <Row label="Summa intäkter" amount={data.result.totalaIntakter} strong />
              <Row label="Varor, material och tjänster" amount={data.result.varukostnader} />
              <Row label="Övriga externa kostnader" amount={data.result.ovrigaExternaKostnader} />
              <Row label="Personalkostnader" amount={data.result.personalkostnader} />
              <Row label="Räntekostnader m.m." amount={data.result.finansiellaKostnader} />
              <Row label="Summa kostnader" amount={data.result.totalaKostnader} strong />
            </div>
            <div
              className={cn(
                'flex items-center justify-between border-t border-surface-border px-4 py-3 text-lg font-semibold',
                data.result.aretsResultat >= 0 ? 'text-primary-700' : 'text-red-600'
              )}
            >
              <span>Årets resultat</span>
              <span className="tabular-nums">{formatSEK(data.result.aretsResultat)}</span>
            </div>
          </div>

          {/* Balansräkning */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportSection title="Tillgångar" lines={data.balance.assets} total={data.balance.totalAssets} totalLabel="Summa tillgångar" />
            <ReportSection
              title="Eget kapital och skulder"
              lines={[
                ...data.balance.equityAndLiabilities,
                { accountId: '__result__', number: 0, name: 'Årets resultat', amount: data.balance.yearResult },
              ]}
              total={data.balance.totalEquityAndLiabilities}
              totalLabel="Summa eget kapital och skulder"
            />
          </div>

          {/* NE-underlag */}
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Underlag till NE-bilagan</h2>
            <p className="mb-4 text-sm text-gray-500">
              Beloppen nedan är härledda från kontoplanen och är ett underlag – stäm av mot Skatteverkets NE-blankett
              innan du lämnar in.
            </p>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <NeTable title="Resultat (R-fält)" fields={data.ne.r} />
              <NeTable title="Balans (B-fält)" fields={data.ne.b} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
