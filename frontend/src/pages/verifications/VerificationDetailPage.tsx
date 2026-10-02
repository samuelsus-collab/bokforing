import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useVerification, useDeleteVerification } from '@/features/verifications/api'
import { formatDate, formatSEK, sumAmount } from '@/lib/utils'

export function VerificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: ver, isLoading } = useVerification(id ?? '')
  const del = useDeleteVerification()
  const [confirming, setConfirming] = useState(false)

  if (isLoading) return <LoadingSpinner fullPage />
  if (!ver) return <p className="text-gray-500">Verifikationen hittades inte.</p>

  const locked = ver.fiscalYear.isClosed
  const debitTotal = sumAmount(ver.rows, 'debit')
  const creditTotal = sumAmount(ver.rows, 'credit')

  const onDelete = async () => {
    await del.mutateAsync(ver.id)
    navigate('/verifikationer')
  }

  return (
    <div>
      <PageHeader
        title={`Verifikation ${ver.number}`}
        description={`${formatDate(ver.date)} · Räkenskapsår ${ver.fiscalYear.label}`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigate('/verifikationer')}>
              <ArrowLeft size={16} /> Tillbaka
            </button>
            {!locked && (
              <>
                <button className="btn-secondary" onClick={() => navigate(`/verifikationer/${ver.id}/redigera`)}>
                  <Pencil size={16} /> Redigera
                </button>
                <button className="btn-danger" onClick={() => setConfirming(true)}>
                  <Trash2 size={16} /> Ta bort
                </button>
              </>
            )}
          </div>
        }
      />

      {locked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Räkenskapsåret är låst – verifikationen kan inte ändras.
        </div>
      )}

      <div className="card mb-6 p-5">
        <p className="text-sm text-gray-500">Verifikationstext</p>
        <p className="font-medium">{ver.description}</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Konto</th>
              <th className="px-4 py-3">Beskrivning</th>
              <th className="px-4 py-3 text-right">Debet</th>
              <th className="px-4 py-3 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {ver.rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">
                  <span className="font-mono">{r.account.number}</span> · {r.account.name}
                </td>
                <td className="px-4 py-2 text-gray-600">{r.description ?? '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {parseFloat(r.debit) ? formatSEK(r.debit) : ''}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {parseFloat(r.credit) ? formatSEK(r.credit) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-surface-border bg-gray-50 font-medium">
            <tr>
              <td className="px-4 py-2" colSpan={2}>
                Summa
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatSEK(debitTotal)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatSEK(creditTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="mb-2 text-lg font-semibold">Ta bort verifikation {ver.number}?</h2>
            <p className="mb-5 text-sm text-gray-500">
              Detta kan inte ångras. I bokföring bör rättelse normalt ske via en ny verifikation, men i ett öppet
              räkenskapsår kan den tas bort.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirming(false)}>
                Avbryt
              </button>
              <button className="btn-danger" onClick={onDelete} disabled={del.isPending}>
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
