import { useEffect, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { useFiscalYears } from '@/features/fiscalYears/api'
import { downloadSie, useImportSie, type ImportResult } from '@/features/sie/api'
import { toast } from 'sonner'

export function SiePage() {
  const { data: years } = useFiscalYears()
  const [exportFyId, setExportFyId] = useState('')
  const [importFyId, setImportFyId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const importSie = useImportSie()

  useEffect(() => {
    if (years?.length) {
      if (!exportFyId) setExportFyId(years[0].id)
      if (!importFyId) setImportFyId(years[0].id)
    }
  }, [years, exportFyId, importFyId])

  const onExport = async () => {
    const label = years?.find((y) => y.id === exportFyId)?.label ?? 'export'
    try {
      await downloadSie(exportFyId, label)
    } catch {
      toast.error('Kunde inte exportera')
    }
  }

  const onImport = async () => {
    if (!file) return
    const res = await importSie.mutateAsync({ fiscalYearId: importFyId, file })
    setResult(res)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <PageHeader title="SIE4 import/export" description="Flytta bokföring till och från appen i det svenska standardformatet SIE4." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Export */}
        <div className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Download size={18} /> Exportera
          </h2>
          <p className="mb-4 text-sm text-gray-500">Ladda ner ett räkenskapsår som en SIE4-fil (.se).</p>
          <label className="label">Räkenskapsår</label>
          <select className="input mb-4 max-w-[220px]" value={exportFyId} onChange={(e) => setExportFyId(e.target.value)}>
            {years?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
          <div>
            <button className="btn-primary" onClick={onExport} disabled={!exportFyId}>
              <Download size={16} /> Exportera SIE4
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Upload size={18} /> Importera
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Läs in en SIE4-fil från ett annat program. Konton, verifikationer (med originaldatum) och ingående
            balanser läggs in i valt räkenskapsår.
          </p>
          <label className="label">Importera till räkenskapsår</label>
          <select className="input mb-3 max-w-[220px]" value={importFyId} onChange={(e) => setImportFyId(e.target.value)}>
            {years?.map((y) => (
              <option key={y.id} value={y.id} disabled={y.isClosed}>
                {y.label} {y.isClosed ? '(låst)' : ''}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".se,.si,.sie,text/plain"
            className="mb-4 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button className="btn-primary" onClick={onImport} disabled={!file || importSie.isPending}>
            <Upload size={16} /> {importSie.isPending ? 'Importerar…' : 'Importera'}
          </button>

          {result && (
            <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
              <p className="font-medium">Import klar</p>
              <ul className="mt-1 list-inside list-disc">
                <li>{result.verificationsCreated} verifikationer</li>
                <li>{result.accountsCreated} nya konton</li>
                <li>Ingående balanser: {result.openingBalanceImported ? 'ja' : 'nej'}</li>
              </ul>
              {result.warnings.length > 0 && (
                <div className="mt-2 text-amber-700">
                  <p className="font-medium">Varningar:</p>
                  <ul className="list-inside list-disc">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-surface-border bg-white p-4 text-xs text-gray-500">
        Tips: importera helst till ett <strong>tomt räkenskapsår</strong> så undviker du dubbletter. Verifikationerna får
        nya löpnummer i en obruten serie, men behåller sina datum. Objekt-/dimensionsdata och budget i filen ignoreras.
      </div>
    </div>
  )
}
