import { useStore } from '../store/useStore'
import { ExternalLink, TrendingDown, PackageSearch, AlertCircle, Store } from 'lucide-react'
import { useState } from 'react'

const fmt = v => v?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

const TYPE_COLORS = {
  supermercado: '#22c55e', hipermercado: '#3b82f6', atacado: '#f97316', marketplace: '#8b5cf6'
}

function StoreLogo({ store, size = 8 }) {
  const [err, setErr] = useState(false)
  const color = TYPE_COLORS[store?.type] || '#64748b'
  const cls = `w-${size} h-${size} rounded-lg flex items-center justify-center shrink-0`
  if (err || !store?.logo_url) {
    return (
      <div style={{ background: color }} className={cls}>
        <span className="text-white text-xs font-bold">{(store?.name||'?').slice(0,2).toUpperCase()}</span>
      </div>
    )
  }
  return (
    <div className={cls + ' bg-white overflow-hidden p-1'}>
      <img src={store.logo_url} alt={store.name}
        className="w-full h-full object-contain"
        onError={() => setErr(true)} />
    </div>
  )
}

function ProductCard({ product }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <a href={product.product_url} target="_blank" rel="noopener noreferrer"
      className="flex flex-col rounded-xl border border-white/8 bg-card hover:border-brand-500/40 hover:bg-muted transition-all overflow-hidden group">
      {/* Imagem */}
      <div className="aspect-square bg-white/5 overflow-hidden">
        {product.image_url && !imgErr
          ? <img src={product.image_url} alt={product.product_name} loading="lazy"
              className="w-full h-full object-contain p-2"
              onError={() => setImgErr(true)} />
          : <div className="w-full h-full flex items-center justify-center">
              <Store size={32} className="text-white/10" />
            </div>
        }
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs text-white/70 line-clamp-2 leading-snug flex-1">{product.product_name}</p>
        {product.unit && <p className="text-xs text-white/30">{product.unit}</p>}
        <div className="flex items-center justify-between mt-1">
          <p className="text-base font-bold gradient-text">{fmt(product.price)}</p>
          {product.discount_pct > 0 && (
            <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded">-{product.discount_pct}%</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={10} className="text-brand-400" />
          <span className="text-xs text-brand-400">Ver oferta</span>
        </div>
      </div>
    </a>
  )
}

function StoreSection({ storeGroup }) {
  const [expanded, setExpanded] = useState(true)
  const { store, products } = storeGroup
  const color = TYPE_COLORS[store.type] || '#64748b'
  const minPrice = products[0]?.price
  const maxPrice = products[products.length-1]?.price

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden">
      {/* Header da loja */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors">
        <StoreLogo store={store} />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white/90">{store.name}</span>
            <span style={{ color }} className="text-xs">{store.type}</span>
          </div>
          <p className="text-xs text-white/30">
            {products.length} produto{products.length > 1 ? 's' : ''} · a partir de {fmt(minPrice)}
            {maxPrice > minPrice && ` até ${fmt(maxPrice)}`}
          </p>
        </div>
        <span className="text-white/30 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Grid de produtos */}
      {expanded && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((p, i) => <ProductCard key={i} product={p} />)}
        </div>
      )}
    </div>
  )
}

export default function ResultsSection() {
  const { results, searchError, searching, lastQuery } = useStore()

  if (searchError) return (
    <div className="flex flex-col items-center py-16 text-center">
      <AlertCircle size={40} className="text-red-400/50 mb-4" />
      <p className="text-white/50 text-sm">{searchError}</p>
    </div>
  )

  if (!results && !searching) return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
        <TrendingDown size={36} className="text-brand-400" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Compare precos em tempo real</h2>
      <p className="text-white/40 text-sm max-w-sm">
        Digite o produto acima e vamos buscar simultaneamente em todos os supermercados da regiao
      </p>
      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        {['arroz 5kg','feijao 1kg','leite integral','frango inteiro','cerveja lata'].map(s => (
          <span key={s} className="text-xs bg-muted border border-white/10 px-3 py-1.5 rounded-full text-white/40">{s}</span>
        ))}
      </div>
    </div>
  )

  if (!results) return null

  const storeGroups = results?.storeGroups || []
  const total_results = results?.total_results || 0
  const elapsed_ms = results?.elapsed_ms || 0

  if (storeGroups.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center">
      <PackageSearch size={48} className="text-white/15 mb-4" />
      <p className="text-white/50">Nenhum resultado para &ldquo;{lastQuery}&rdquo;</p>
      <p className="text-white/25 text-sm mt-1">Tente termos mais simples, ex: apenas o nome do produto</p>
    </div>
  )

  // Menor preco geral
  const bestPrice = Math.min(...storeGroups.map(g => g.products[0]?.price || 9999))
  const bestStore = storeGroups.find(g => g.products[0]?.price === bestPrice)

  return (
    <div>
      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <p className="text-white/40 text-xs">Resultados para</p>
          <p className="font-semibold text-white/90">&ldquo;{lastQuery}&rdquo;</p>
        </div>
        <div className="text-xs text-white/30">
          {total_results} produtos · {storeGroups.length} lojas · {(elapsed_ms/1000).toFixed(1)}s
        </div>
        {bestStore && (
          <div className="ml-auto flex items-center gap-2 bg-green-900/30 border border-green-500/20 px-3 py-2 rounded-xl">
            <TrendingDown size={14} className="text-green-400" />
            <span className="text-xs text-green-400">
              Menor preco: {fmt(bestPrice)} no {bestStore.store.name}
            </span>
          </div>
        )}
      </div>

      {/* Seção por loja */}
      <div className="space-y-4">
        {storeGroups.map(g => <StoreSection key={g.store.id} storeGroup={g} />)}
      </div>
    </div>
  )
}
