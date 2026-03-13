import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useState } from 'react'

function StoreFavicon({ name, logo, website }) {
  const [src, setSrc] = useState(logo || '')
  const [tries, setTries] = useState(0)
  const fallbacks = [logo, website ? `https://www.google.com/s2/favicons?domain=${website}&sz=32` : null].filter(Boolean)

  function handleError() {
    const next = tries + 1
    setTries(next)
    if (next < fallbacks.length) setSrc(fallbacks[next])
    else setSrc('')
  }

  if (!src) return (
    <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
      <span className="text-white text-[8px] font-bold">{(name||'?').slice(0,2).toUpperCase()}</span>
    </div>
  )
  return <img src={src} alt={name} className="w-4 h-4 object-contain rounded" onError={handleError} />
}

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
          title={s.ok ? s.name + ': ' + s.count + ' resultados' : 'Erro: ' + (s.error || '')}
          className="flex items-center gap-1.5 text-xs">
          {s.ok
            ? <CheckCircle size={12} className="text-green-500/70" />
            : <XCircle size={12} className="text-red-500/40" />}
          <StoreFavicon name={s.name || id} logo={s.logo} website={s.website} />
          <span className={s.ok ? 'text-white/50' : 'text-white/20 line-through'}>{s.name || id}</span>
          {s.ok && s.count > 0 && <span className="text-white/25">({s.count})</span>}
        </div>
      ))}
    </div>
  )
}
