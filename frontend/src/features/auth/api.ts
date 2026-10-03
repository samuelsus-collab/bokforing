import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types/bokforing'

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api
        .post<{ success: boolean; data: { token: string; user: AuthUser } }>('/auth/login', data)
        .then((r) => r.data.data),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data).then((r) => r.data),
    onSuccess: () => toast.success('Lösenordet är ändrat'),
    onError: (err: any) => {
      const code = err?.response?.data?.error?.code
      toast.error(code === 'WRONG_PASSWORD' ? 'Fel nuvarande lösenord' : 'Kunde inte ändra lösenordet')
    },
  })
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<{ success: boolean; data: AuthUser }>('/auth/me')
  return res.data.data
}
