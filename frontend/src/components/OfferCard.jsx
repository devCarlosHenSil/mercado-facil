import { ExternalLink, MapPin, Tag } from 'lucide-react'

const TYPE_LABELS = {
  supermercado:'Supermercado', hipermercado:'Hipermercado', atacado:'Atacado',
  marketplace:'Online', delivery:'Delivery', agregador:'Encartes'
}

const TYPE_COLORS = {
  supermercado:'#22c55e', hipermercado:'#3b82f6', atacado:'#f97316',
  marketplace:'#8b5cf6', delivery:'#ef4444', agregador:'#64748b'
}

const fmt = (v) => v?.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

function StoreBadge({ store }) {
  const color = TYPE_COLORS[store?.type] || '#64748b'
  const label = TYPE_LABELS[store?.type] || store?.type

  return (
    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2.5">
      {/* Logo da loja — maior e com fundo branco para visibilidade */}
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden">
        <img
          src={store?.logo_url}
          alt={store?.name}
          className="w-7 h-7 object-contain"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.parentElement.style.background = color
            e.target.parentElement.innerHTML = '<span style="color:white;font-size:11px;font-weight:700;">' + (store?.name||'?').slice(0,2).toUpperCase() + '</span>'
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/80 truncate leading-tight">{store?.name}</p>
        <span style={{ background: color + '22', color: color, border: '1px solid ' + color + '44' }}
          className="text-xs px-1.5 py-0.5 rounded font-mono">{label}</span>
      </div>
    </div>
  )
}

export default function OfferCard({ offer, index=0 }) {
  return (
    <a href={offer.product_url||offer.store?.website||'#'} target="_blank" rel="noopener noreferrer"
      style={{ animationDelay: (index%20)*30+'ms' }}
      className="animate-fade-up group block rounded-2xl border border-white/8 bg-card card-hover overflow-hidden">

      {/* Imagem */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <img src={offer.image_url} alt={offer.product_name} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://placehold.co/300x200/1a1a23/f97316?text=' + encodeURIComponent((offer.product_name||'').split(' ').slice(0,2).join('+'))
          }} />

        {/* Badge desconto */}
        {offer.discount_pct > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
            -{Math.round(offer.discount_pct)}%
          </div>
        )}

        {/* Badge online/distancia */}
        {offer.is_online ? (
          <div className="absolute top-2.5 right-2.5 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-lg">Online</div>
        ) : offer.distance_km > 0 ? (
          <div className="absolute top-2.5 right-2.5 bg-black/70 text-white/80 text-xs px-2 py-1 rounded-lg flex items-center gap-0.5">
            <MapPin size={9}/>{offer.distance_km?.toFixed(1)}km
          </div>
        ) : null}
      </div>

      {/* Conteudo */}
      <div className="p-3.5">
        {/* Categoria */}
        <div className="flex items-center gap-1 mb-1.5">
          <Tag size={10} className="text-brand-400/60" />
          <span className="text-xs text-white/30 uppercase tracking-wider">{offer.category}</span>
        </div>

        {/* Nome completo do produto */}
        <h3 className="font-semibold text-sm text-white/90 leading-snug line-clamp-2 group-hover:text-brand-300 transition-colors mb-1">
          {offer.product_name}
        </h3>
        <p className="text-xs text-white/30 mb-3">{offer.unit}</p>

        {/* Precos */}
        <div className="flex items-end justify-between">
          <div>
            {offer.old_price > 0 && (
              <p className="text-xs text-white/30 line-through">{fmt(offer.old_price)}</p>
            )}
            <p className="text-xl font-bold gradient-text">{fmt(offer.price)}</p>
          </div>
          <ExternalLink size={14} className="text-white/20 group-hover:text-brand-400 mb-1" />
        </div>

        {/* Loja */}
        <StoreBadge store={offer.store} />
      </div>
    </a>
  )
}
