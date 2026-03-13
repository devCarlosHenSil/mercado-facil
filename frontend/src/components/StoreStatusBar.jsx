import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function StoreStatusBar() {
  const { results, searching } = useStore()
  if (!results && !searching) return null

  const stores = Object.entries(results?.stores || {})

  return (
    <div className="flex flex-wrap items-center gap-3 py-2 min-h-[28px]">
      {searching && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 size={14} className="animate-spin text-brand-400" />
          Buscando em todos os supermercados...
        </div>
      )}
      {stores.map(([id, s]) => (
        <div key={id}
          title={s.ok ? id + ': ' + s.count + ' resultados' : 'Erro: ' + (s.error || '')}
          className="flex items-center gap-1.5 text-xs">
          {s.ok
            ? <CheckCircle size={12} className="text-green-500/70" />
            : <XCircle size={12} className="text-red-500/40" />}
          <span className={s.ok ? 'text-white/50' : 'text-white/20 line-through'}>{s.name || id}</span>
          {s.ok && s.count > 0 && <span className="text-white/25">({s.count})</span>}
        </div>
      ))}
    </div>
  )
}
