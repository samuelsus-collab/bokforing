import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { tokenStorage } from '@/lib/auth'
import { fetchMe } from '@/features/auth/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function ProtectedRoute() {
  const { user, setUser, logout } = useAuthStore()
  const [checking, setChecking] = useState(!user && !!tokenStorage.get())

  useEffect(() => {
    if (!user && tokenStorage.get()) {
      fetchMe()
        .then((u) => setUser(u))
        .catch(() => logout())
        .finally(() => setChecking(false))
    }
  }, [user, setUser, logout])

  if (!tokenStorage.get()) return <Navigate to="/login" replace />
  if (checking) return <LoadingSpinner fullPage />
  return <Outlet />
}
