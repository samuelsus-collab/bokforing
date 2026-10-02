import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { useAccounts, useCreateAccount } from '@/features/accounts/api'
import { ACCOUNT_TYPE_LABEL, type AccountType } from '@/types/bokforing'
import { cn } from '@/lib/utils'

const TYPES: AccountType[] = ['TILLGANG', 'SKULD', 'EGET_KAPITAL', 'INTAKT', 'KOSTNAD']

const schema = z.object({
  number: z.coerce.number().int().min(1000).max(9999),
  name: z.string().min(1, 'Ange namn'),
  type: z.enum(['TILLGANG', 'SKULD', 'EGET_KAPITAL', 'INTAKT', 'KOSTNAD']),
  vatRate: z.coerce.number().min(0).max(100).optional(),
})
type FormData = z.infer<typeof schema>

export function AccountsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('')
  const [showForm, setShowForm] = useState(false)
  const { data: accounts, isLoading } = useAccounts({
    search: search || undefined,
    type: typeFilter || undefined,
  })
  const createAccount = useCreateAccount()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { type: 'KOSTNAD' } })

  const onSubmit = handleSubmit(async (data) => {
    await createAccount.mutateAsync({
      number: data.number,
      name: data.name,
      type: data.type,
      vatRate: data.vatRate ?? null,
    })
    reset({ type: 'KOSTNAD', name: '', number: undefined as any })
    setShowForm(false)
  })

  return (
    <div>
      <PageHeader
        title="Kontoplan"
        description="Konton enligt BAS-standard som verifikationer bokförs mot."
        actions={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Stäng' : 'Nytt konto'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-4">
          <div>
            <label className="label">Kontonr</label>
            <input className={cn('input', errors.number && 'border-red-400')} type="number" {...register('number')} />
            {errors.number && <p className="mt-1 text-xs text-red-600">1000–9999</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Namn</label>
            <input className={cn('input', errors.name && 'border-red-400')} {...register('name')} />
          </div>
          <div>
            <label className="label">Typ</label>
            <select className="input" {...register('type')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Momssats % (valfritt)</label>
            <input className="input" type="number" step="0.01" {...register('vatRate')} />
          </div>
          <div className="flex items-end sm:col-span-3">
            <button className="btn-primary" type="submit" disabled={isSubmitting}>
              Spara konto
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Sök namn eller nummer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[200px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AccountType | '')}>
          <option value="">Alla typer</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : !accounts || accounts.length === 0 ? (
          <EmptyState title="Inga konton" description="Lägg till ett konto för att komma igång." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nr</th>
                <th className="px-4 py-3">Namn</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Moms</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {accounts.map((a) => (
                <tr key={a.id} className={cn(!a.isActive && 'opacity-50')}>
                  <td className="px-4 py-2 font-mono">{a.number}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-gray-600">{ACCOUNT_TYPE_LABEL[a.type]}</td>
                  <td className="px-4 py-2 text-gray-600">{a.vatRate ? `${parseFloat(a.vatRate)} %` : '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{a.isActive ? 'Aktiv' : 'Inaktiv'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
