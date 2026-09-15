import { useMutation } from '@tanstack/react-query'
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

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<{ success: boolean; data: AuthUser }>('/auth/me')
  return res.data.data
}
