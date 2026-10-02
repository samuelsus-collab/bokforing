import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { useLogin } from '@/features/auth/api'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Ogiltig e-post'),
  password: z.string().min(1, 'Ange lösenord'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loginMutation = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await loginMutation.mutateAsync(data)
      login(res.token, res.user)
      navigate('/verifikationer')
    } catch {
      toast.error('Fel e-post eller lösenord')
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2 text-xl font-semibold text-primary-700">
          <BookOpen className="h-6 w-6" /> Bokföring
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">E-post</label>
            <input className={cn('input', errors.email && 'border-red-400')} type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Lösenord</label>
            <input className={cn('input', errors.password && 'border-red-400')} type="password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
            Logga in
          </button>
        </form>
      </div>
    </div>
  )
}
