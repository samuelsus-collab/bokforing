import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { useChangePassword } from '@/features/auth/api'
import { useAuthStore } from '@/store/authStore'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('Nytt lösenord måste vara minst 8 tecken')
      return
    }
    if (newPassword !== confirm) {
      toast.error('Lösenorden matchar inte')
      return
    }
    await changePassword.mutateAsync({ currentPassword, newPassword })
    setCurrentPassword('')
    setNewPassword('')
    setConfirm('')
  }

  return (
    <div>
      <PageHeader title="Inställningar" description="Konto och säkerhet." />

      <div className="card max-w-md p-5">
        <h2 className="mb-1 font-semibold">Byt lösenord</h2>
        <p className="mb-4 text-sm text-gray-500">Inloggad som {user?.email}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nuvarande lösenord</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Nytt lösenord (minst 8 tecken)</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Bekräfta nytt lösenord</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={changePassword.isPending || !currentPassword || !newPassword}>
            Byt lösenord
          </button>
        </form>
      </div>
    </div>
  )
}
