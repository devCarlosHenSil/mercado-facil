import { ChevronDown, ChevronUp, ExternalLink, TrendingDown, Trophy } from 'lucide-react'
import { useState } from 'react'

const TYPE_COLORS = {
  supermercado:'#22c55e', hipermercado:'#3b82f6', atacado:'#f97316',
  marketplace:'#8b5cf6', delivery:'#ef4444'
}
const fmt = v => v?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

// Favicon fallback chain: favicon.ico → google favicon service → initials
function StoreLogo({ store }) {
  const [src, setSrc] = useState(store?.logo_url || '')
  const [tries, setTries] = useState(0)
  const color = TYPE_COLORS[store?.type] || '#64748b'

  const fallbacks = [
    store?.logo_url,
    store?.website ? `https://www.google.com/s2/favicons?domain=${store.website}&sz=64` : null,
  ].filter(Boolean)

  function handleError() {
    const next = tries + 1
    setTries(next)
    if (next < fallbacks.length) setSrc(fallbacks[next])
    else setSrc('')
  }

  if (!src) {
    return (
      <div style={{ background: color }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">{(store?.name||'?').slice(0,2).toUpperCase()}</span>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
      <img src={src} alt={store?.name} className="w-full h-full object-contain" onError={handleError} />
    </div>
  )
}

export default function PriceGroupCard({ group }) {
  const [expanded, setExpanded] = useState(false)
  const best = group.results[0]
  const worst = group.results[group.results.length - 1]
  const hasMultiple = group.results.length > 1

  return (
    <div className="rounded-2xl border border-white/8 bg-card card-hover overflow-hidden animate-fade-up">
      {/* Imagem do melhor resultado */}
      {best.image_url && (
        <div className="relative aspect-square bg-white/5 overflow-hidden rounded-t-2xl">
          <img
            src={best.image_url}
            alt={group.canonical_name}
            loading="lazy"
            className="w-full h-full object-contain p-3"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={e => {
              // Try without crossorigin on second attempt
              if (e.target.dataset.retry) { e.target.parentElement.style.display='none'; return }
              e.target.dataset.retry = '1'
              e.target.removeAttribute('crossorigin')
              e.target.src = e.target.src
            }}
          />
          {group.savings > 0.5 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
              <TrendingDown size={11} /> Economize {fmt(group.savings)}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Nome do produto */}
        <h3 className="font-semibold text-sm text-white/90 line-clamp-2 mb-3 leading-snug">
          {group.canonical_name}
        </h3>

        {/* Melhor preço em destaque */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={12} className="text-yellow-400" />
              <span className="text-xs text-white/40">Menor preço</span>
            </div>
            <p className="text-2xl font-bold gradient-text">{fmt(best.price)}</p>
            {best.unit && <p className="text-xs text-white/30 mt-0.5">{best.unit}</p>}
          </div>
          <a href={best.product_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
            Ver oferta <ExternalLink size={11} />
          </a>
        </div>

        {/* Loja do melhor preço */}
        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
          <StoreLogo store={best.store} />
          <div>
            <p className="text-xs font-semibold text-white/80">{best.store.name}</p>
            <span style={{ color: TYPE_COLORS[best.store.type] || '#64748b' }}
              className="text-xs">{best.store.type}</span>
          </div>
        </div>

        {/* Comparativo — demais lojas */}
        {hasMultiple && (
          <div className="mt-3">
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-xs text-white/40 hover:text-white/70 transition-colors">
              <span>{group.results.length - 1} outra{group.results.length > 2 ? 's' : ''} loja{group.results.length > 2 ? 's' : ''}</span>
              <div className="flex items-center gap-1">
                {!expanded && worst.price > best.price && (
                  <span className="text-red-400/60">até {fmt(worst.price)}</span>
                )}
                {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </div>
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {group.results.slice(1).map((r, i) => {
                  const diff = r.price - best.price
                  return (
                    <a key={i} href={r.product_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <StoreLogo store={r.store} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 truncate">{r.store.name}</p>
                        <p className="text-xs text-white/40 truncate">{r.product_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white/80">{fmt(r.price)}</p>
                        {diff > 0.01 && (
                          <p className="text-xs text-red-400/60">+{fmt(diff)}</p>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Nenhuma comparação */}
        {!hasMultiple && (
          <p className="mt-2 text-xs text-white/20 italic">Encontrado em 1 loja</p>
        )}
      </div>
    </div>
  )
}
