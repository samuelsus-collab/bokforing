import { useState } from 'react'
import { Plus, Lock, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { useFiscalYears, useCreateFiscalYear } from '@/features/fiscalYears/api'
import { formatDate } from '@/lib/utils'

export function FiscalYearsPage() {
  const { data: years, isLoading } = useFiscalYears()
  const createFY = useCreateFiscalYear()
  const [showForm, setShowForm] = useState(false)
  const nextYear = new Date().getFullYear()
  const [label, setLabel] = useState(String(nextYear))

  const onCreate = async () => {
    const y = Number(label)
    await createFY.mutateAsync({
      label,
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
    })
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Räkenskapsår"
        description="För enskild firma är räkenskapsåret alltid kalenderår."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Stäng' : 'Nytt räkenskapsår'}
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6 flex items-end gap-4 p-5">
          <div>
            <label className="label">År</label>
            <input className="input w-32" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={onCreate} disabled={createFY.isPending}>
            Skapa {label}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : !years || years.length === 0 ? (
          <EmptyState title="Inga räkenskapsår" />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">År</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Verifikationer</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {years.map((y) => (
                <tr key={y.id}>
                  <td className="px-4 py-2 font-medium">{y.label}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {formatDate(y.startDate)} – {formatDate(y.endDate)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{y._count?.verifications ?? 0}</td>
                  <td className="px-4 py-2">
                    {y.isClosed ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Lock size={14} /> Låst
                      </span>
                    ) : (
                      <span className="text-primary-600">Öppet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
