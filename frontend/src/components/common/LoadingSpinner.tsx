import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div className={cn('flex items-center justify-center', fullPage ? 'h-[60vh]' : 'py-8')}>
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
    </div>
  )
}
