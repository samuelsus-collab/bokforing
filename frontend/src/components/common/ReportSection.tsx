import { formatSEK } from '@/lib/utils'
import type { ReportLine } from '@/features/reports/api'

export function ReportSection({
  title,
  lines,
  total,
  totalLabel = 'Summa',
  emptyText = 'Inga poster',
}: {
  title: string
  lines: ReportLine[]
  total: number
  totalLabel?: string
  emptyText?: string
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-surface-border">
          {lines.length === 0 ? (
            <tr>
              <td className="px-4 py-3 text-gray-400">{emptyText}</td>
              <td />
            </tr>
          ) : (
            lines.map((l) => (
              <tr key={l.accountId}>
                <td className="px-4 py-2">
                  <span className="font-mono text-gray-500">{l.number}</span> {l.name}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatSEK(l.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="border-t border-surface-border bg-gray-50 font-semibold">
          <tr>
            <td className="px-4 py-2">{totalLabel}</td>
            <td className="px-4 py-2 text-right tabular-nums">{formatSEK(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
