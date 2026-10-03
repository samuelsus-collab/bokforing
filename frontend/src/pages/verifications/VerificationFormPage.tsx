import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useAccounts } from '@/features/accounts/api'
import { useFiscalYears } from '@/features/fiscalYears/api'
import {
  useCreateVerification,
  useUpdateVerification,
  useVerification,
} from '@/features/verifications/api'
import { formatSEK, cn } from '@/lib/utils'
import type { Account } from '@/types/bokforing'

interface EditableRow {
  accountNo: string // kontonummer som text (t.ex. "1930")
  debit: string
  credit: string
  description: string
}

const emptyRow = (): EditableRow => ({ accountNo: '', debit: '', credit: '', description: '' })

const round2 = (n: number) => Math.round(n * 100) / 100

export function VerificationFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  // Alla konton (även inaktiva) för uppslag; endast aktiva i förslagslistan.
  const { data: accounts } = useAccounts({})
  const { data: years } = useFiscalYears()
  const { data: existing, isLoading: loadingExisting } = useVerification(id ?? '')

  const createVer = useCreateVerification()
  const updateVer = useUpdateVerification(id ?? '')

  const [fiscalYearId, setFiscalYearId] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<EditableRow[]>([emptyRow(), emptyRow()])

  // Uppslag kontonummer -> konto.
  const accountByNumber = useMemo(() => {
    const m = new Map<number, Account>()
    accounts?.forEach((a) => m.set(a.number, a))
    return m
  }, [accounts])
  const resolve = (accountNo: string): Account | undefined => {
    const n = parseInt(String(accountNo).trim(), 10)
    return Number.isNaN(n) ? undefined : accountByNumber.get(n)
  }
  const activeAccounts = useMemo(() => accounts?.filter((a) => a.isActive) ?? [], [accounts])

  // Förvälj öppet räkenskapsår + dagens datum för nya verifikationer.
  useEffect(() => {
    if (!isEdit && years && !fiscalYearId) {
      const open = years.find((y) => !y.isClosed) ?? years[0]
      if (open) setFiscalYearId(open.id)
      if (!date) setDate(new Date().toISOString().slice(0, 10))
    }
  }, [isEdit, years, fiscalYearId, date])

  // Fyll i vid redigering.
  useEffect(() => {
    if (isEdit && existing) {
      setFiscalYearId(existing.fiscalYear.id)
      setDate(existing.date.slice(0, 10))
      setDescription(existing.description)
      setRows(
        existing.rows.map((r) => ({
          accountNo: String(r.account.number),
          debit: parseFloat(r.debit) ? String(parseFloat(r.debit)) : '',
          credit: parseFloat(r.credit) ? String(parseFloat(r.credit)) : '',
          description: r.description ?? '',
        }))
      )
    }
  }, [isEdit, existing])

  const totals = useMemo(() => {
    const debit = round2(rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0))
    const credit = round2(rows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0))
    return { debit, credit, diff: round2(debit - credit) }
  }, [rows])

  const rowsValid = rows.every((r) => {
    if (!r.accountNo && !r.debit && !r.credit) return true // tom rad ignoreras
    const d = parseFloat(r.debit) || 0
    const c = parseFloat(r.credit) || 0
    return !!resolve(r.accountNo) && (d > 0) !== (c > 0)
  })
  const filledRows = rows.filter(
    (r) => resolve(r.accountNo) && ((parseFloat(r.debit) || 0) > 0 || (parseFloat(r.credit) || 0) > 0)
  )
  const canSave =
    !!fiscalYearId &&
    !!date &&
    description.trim().length > 0 &&
    filledRows.length >= 2 &&
    rowsValid &&
    totals.debit > 0 &&
    totals.diff === 0

  const updateRow = (i: number, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (i: number) => setRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)))

  const onSubmit = async () => {
    const payloadRows = filledRows.map((r) => ({
      accountId: resolve(r.accountNo)!.id,
      debit: parseFloat(r.debit) || 0,
      credit: parseFloat(r.credit) || 0,
      description: r.description || undefined,
    }))
    try {
      if (isEdit) {
        await updateVer.mutateAsync({ date, description, rows: payloadRows })
        navigate(`/verifikationer/${id}`)
      } else {
        const created = await createVer.mutateAsync({ fiscalYearId, date, description, rows: payloadRows })
        navigate(`/verifikationer/${created.id}`)
      }
    } catch {
      /* toast hanteras i hook */
    }
  }

  if (isEdit && loadingExisting) return <LoadingSpinner fullPage />
  const closed = isEdit && existing?.fiscalYear.isClosed

  return (
    <div>
      <PageHeader
        title={isEdit ? `Redigera verifikation ${existing?.number ?? ''}` : 'Ny verifikation'}
        actions={
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Tillbaka
          </button>
        }
      />

      {/* Förslagslista för kontonummer (autocomplete). */}
      <datalist id="konto-list">
        {activeAccounts.map((a) => (
          <option key={a.id} value={a.number}>
            {a.number} · {a.name}
          </option>
        ))}
      </datalist>

      {closed && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Räkenskapsåret är låst – verifikationen kan inte ändras.
        </div>
      )}

      <div className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label">Räkenskapsår</label>
          <select className="input" value={fiscalYearId} disabled={isEdit} onChange={(e) => setFiscalYearId(e.target.value)}>
            <option value="">Välj…</option>
            {years?.map((y) => (
              <option key={y.id} value={y.id} disabled={y.isClosed}>
                {y.label} {y.isClosed ? '(låst)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Verifikationsdatum</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Verifikationstext</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="t.ex. Kontant försäljning" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="w-56 px-3 py-2">Konto</th>
              <th className="px-3 py-2">Beskrivning</th>
              <th className="px-3 py-2 text-right">Debet</th>
              <th className="px-3 py-2 text-right">Kredit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((r, i) => {
              const acc = resolve(r.accountNo)
              const unknown = r.accountNo.trim() !== '' && !acc
              return (
                <tr key={i}>
                  <td className="px-3 py-2 align-top">
                    <input
                      className={cn('input', unknown && 'border-red-400')}
                      list="konto-list"
                      inputMode="numeric"
                      placeholder="Kontonr"
                      value={r.accountNo}
                      onChange={(e) => updateRow(i, { accountNo: e.target.value })}
                    />
                    {acc ? (
                      <p className="mt-1 truncate text-xs text-gray-500">{acc.name}</p>
                    ) : unknown ? (
                      <p className="mt-1 text-xs text-red-600">Okänt konto</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input className="input" value={r.description} onChange={(e) => updateRow(i, { description: e.target.value })} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      className="input text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.debit}
                      onChange={(e) => updateRow(i, { debit: e.target.value, credit: e.target.value ? '' : r.credit })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      className="input text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.credit}
                      onChange={(e) => updateRow(i, { credit: e.target.value, debit: e.target.value ? '' : r.debit })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <button className="btn-ghost" onClick={() => removeRow(i)} disabled={rows.length <= 2} title="Ta bort rad">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-surface-border bg-gray-50 font-medium">
            <tr>
              <td className="px-3 py-2" colSpan={2}>
                <button className="btn-ghost" onClick={addRow}>
                  <Plus size={16} /> Lägg till rad
                </button>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEK(totals.debit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEK(totals.credit)}</td>
              <td></td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-500" colSpan={2}>
                Differens (ska vara 0)
              </td>
              <td
                className={cn('px-3 py-2 text-right tabular-nums', totals.diff === 0 ? 'text-primary-600' : 'text-red-600')}
                colSpan={2}
              >
                {formatSEK(totals.diff)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {!canSave && totals.diff !== 0 && (
          <span className="text-sm text-red-600">Debet och kredit måste balansera</span>
        )}
        <button
          className="btn-primary"
          onClick={onSubmit}
          disabled={!canSave || closed || createVer.isPending || updateVer.isPending}
        >
          {isEdit ? 'Spara ändringar' : 'Bokför verifikation'}
        </button>
      </div>
    </div>
  )
}
