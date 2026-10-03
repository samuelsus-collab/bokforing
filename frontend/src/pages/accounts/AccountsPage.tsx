import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil, Trash2, EyeOff, Eye } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccountById,
  useDeleteAccount,
} from '@/features/accounts/api'
import { ACCOUNT_TYPE_LABEL, type Account, type AccountType } from '@/types/bokforing'
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
  const [showInactive, setShowInactive] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)

  const { data: accounts, isLoading } = useAccounts({
    search: search || undefined,
    type: typeFilter || undefined,
    isActive: showInactive ? undefined : true,
  })
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccountById()
  const deleteAccount = useDeleteAccount()

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

  const onDelete = async () => {
    if (!deleting) return
    await deleteAccount.mutateAsync(deleting.id)
    setDeleting(null)
  }

  return (
    <div>
      <PageHeader
        title="Kontoplan"
        description="Lägg till egna konton, byt namn/typ och inaktivera konton du inte använder."
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
        <label className="ml-1 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Visa inaktiva
        </label>
      </div>

      <div className="card overflow-x-auto">
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
                <th className="px-4 py-3 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {accounts.map((a) => (
                <tr key={a.id} className={cn(!a.isActive && 'bg-gray-50/50 text-gray-400')}>
                  <td className="px-4 py-2 font-mono">{a.number}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-gray-600">{ACCOUNT_TYPE_LABEL[a.type]}</td>
                  <td className="px-4 py-2 text-gray-600">{a.vatRate ? `${parseFloat(a.vatRate)} %` : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', a.isActive ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500')}>
                      {a.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost" title="Redigera" onClick={() => setEditing(a)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-ghost"
                        title={a.isActive ? 'Inaktivera' : 'Aktivera'}
                        onClick={() => updateAccount.mutate({ id: a.id, data: { isActive: !a.isActive } })}
                      >
                        {a.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button className="btn-ghost text-red-500" title="Ta bort" onClick={() => setDeleting(a)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateAccount.mutateAsync({ id: editing.id, data: patch })
            setEditing(null)
          }}
          saving={updateAccount.isPending}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="mb-2 text-lg font-semibold">
              Ta bort konto {deleting.number} {deleting.name}?
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Konton som redan använts i verifikationer tas inte bort utan inaktiveras (så historiken bevaras). Oanvända
              konton tas bort helt.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeleting(null)}>
                Avbryt
              </button>
              <button className="btn-danger" onClick={onDelete} disabled={deleteAccount.isPending}>
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditAccountModal({
  account,
  onClose,
  onSave,
  saving,
}: {
  account: Account
  onClose: () => void
  onSave: (patch: { name: string; type: AccountType; vatRate: number | null; sruCode: string | null }) => void
  saving: boolean
}) {
  const [name, setName] = useState(account.name)
  const [type, setType] = useState<AccountType>(account.type)
  const [vatRate, setVatRate] = useState(account.vatRate ? String(parseFloat(account.vatRate)) : '')
  const [sruCode, setSruCode] = useState(account.sruCode ?? '')

  useEffect(() => {
    setName(account.name)
    setType(account.type)
    setVatRate(account.vatRate ? String(parseFloat(account.vatRate)) : '')
    setSruCode(account.sruCode ?? '')
  }, [account])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Redigera konto <span className="font-mono">{account.number}</span>
          </h2>
          <button className="btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Namn</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Typ</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Momssats %</label>
              <input className="input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </div>
            <div>
              <label className="label">SRU-kod (NE)</label>
              <input className="input" value={sruCode} onChange={(e) => setSruCode(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Avbryt
          </button>
          <button
            className="btn-primary"
            disabled={saving || !name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                type,
                vatRate: vatRate === '' ? null : parseFloat(vatRate),
                sruCode: sruCode.trim() === '' ? null : sruCode.trim(),
              })
            }
          >
            Spara ändringar
          </button>
        </div>
      </div>
    </div>
  )
}
