import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, Scale, AlertTriangle, CheckCircle2, ScrollText } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { useDashboard } from '@/features/reports/api'
import { formatSEK, cn } from '@/lib/utils'

// Distinkta kategorifärger (blå/orange) + mörk linje för resultat.
const C_INCOME = '#3b82f6'
const C_EXPENSE = '#f59e0b'
const C_RESULT = '#2d6a4f'

function Kpi({ label, value, icon, tone = 'default', to }: { label: string; value: string; icon: ReactNode; tone?: 'default' | 'good' | 'bad'; to?: string }) {
  const body = (
    <div className="card h-full p-5">
      <div className="mb-2 flex items-center justify-between text-gray-400">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {icon}
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', tone === 'good' && 'text-primary-700', tone === 'bad' && 'text-red-600')}>
        {value}
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function compactKr(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)} tkr`
  return `${v} kr`
}

export function DashboardPage() {
  const { data: years } = useFiscalYears()
  const [fiscalYearId, setFiscalYearId] = useState('')
  useEffect(() => {
    if (!fiscalYearId && years?.length) setFiscalYearId(years[0].id)
  }, [years, fiscalYearId])

  const { data, isLoading } = useDashboard({ fiscalYearId })

  return (
    <div>
      <PageHeader
        title="Översikt"
        description={data ? `Räkenskapsår ${data.fiscalYear.label}` : 'Hur det går för firman'}
        actions={
          <select className="input max-w-[140px]" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
            {years?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        }
      />

      {isLoading || !data ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* KPI-rutor */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Omsättning" value={formatSEK(data.income)} icon={<TrendingUp size={18} />} to="/rapporter/resultat" />
            <Kpi label="Kostnader" value={formatSEK(data.expenses)} icon={<TrendingDown size={18} />} to="/rapporter/resultat" />
            <Kpi
              label="Resultat"
              value={formatSEK(data.result)}
              icon={<Scale size={18} />}
              tone={data.result >= 0 ? 'good' : 'bad'}
              to="/rapporter/resultat"
            />
            <Kpi label="Likviditet (kassa + bank)" value={formatSEK(data.liquidity)} icon={<Wallet size={18} />} to="/rapporter/balans" />
          </div>

          {/* Månadsgraf */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Omsättning, kostnader och resultat per månad</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.months} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tickFormatter={compactKr} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={56} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatSEK(v), name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="income" name="Omsättning" fill={C_INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Kostnader" fill={C_EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line dataKey="result" name="Resultat" type="monotone" stroke={C_RESULT} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Att göra / status */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Att göra</h3>
              {data.hasVatDeviation ? (
                <Link to="/rapporter/moms" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>Momsavvikelse upptäckt – kontrollera momsrapporten.</span>
                </Link>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>Inga åtgärder – momsen stämmer.</span>
                </div>
              )}
            </div>

            <div className="card flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Moms netto</p>
                <p className={cn('text-xl font-semibold tabular-nums', data.netVat >= 0 ? 'text-gray-900' : 'text-primary-700')}>
                  {formatSEK(Math.abs(data.netVat))}
                </p>
                <p className="text-xs text-gray-500">{data.netVat >= 0 ? 'att betala' : 'att få tillbaka'}</p>
              </div>
            </div>

            <Link to="/verifikationer" className="card flex items-center justify-between p-5 hover:bg-gray-50">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Verifikationer</p>
                <p className="text-xl font-semibold tabular-nums">{data.verificationCount}</p>
                <p className="text-xs text-gray-500">i räkenskapsåret</p>
              </div>
              <ScrollText size={20} className="text-gray-300" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
