import { create } from 'zustand'
import type { AuthUser } from '@/types/bokforing'
import { tokenStorage } from '@/lib/auth'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!tokenStorage.get(),
  setUser: (user) => set({ user, isAuthenticated: !!user || !!tokenStorage.get() }),
  login: (token, user) => {
    tokenStorage.set(token)
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    tokenStorage.clear()
    set({ user: null, isAuthenticated: false })
  },
}))
