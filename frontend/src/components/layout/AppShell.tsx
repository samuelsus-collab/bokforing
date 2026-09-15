import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/store/authStore'

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-3">
          <div className="text-sm text-gray-500">{user?.name ?? ''}</div>
          <button className="btn-ghost" onClick={logout}>
            <LogOut size={16} /> Logga ut
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
