import { NavLink } from 'react-router-dom'
import { BookOpen, ListTree, ScrollText, CalendarRange, TrendingUp, Scale, Percent, FileCheck, ArrowLeftRight, Library } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Verifikationer', to: '/verifikationer', icon: ScrollText },
  { label: 'Huvudbok', to: '/huvudbok', icon: Library },
  { label: 'Resultatrapport', to: '/rapporter/resultat', icon: TrendingUp },
  { label: 'Balansrapport', to: '/rapporter/balans', icon: Scale },
  { label: 'Momsrapport', to: '/rapporter/moms', icon: Percent },
  { label: 'Årsbokslut', to: '/arsbokslut', icon: FileCheck },
  { label: 'SIE import/export', to: '/sie', icon: ArrowLeftRight },
  { label: 'Kontoplan', to: '/kontoplan', icon: ListTree },
  { label: 'Räkenskapsår', to: '/rakenskapsar', icon: CalendarRange },
]

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-col bg-sidebar-bg text-white">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold">
        <BookOpen className="h-6 w-6" />
        Bokföring
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-sidebar-active text-white' : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-white/50">Enskild firma · kontantmetoden</div>
    </aside>
  )
}
