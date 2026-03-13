import { ExternalLink, MapPin, Clock, Tag } from 'lucide-react'

const STORE_TYPE_LABELS = {
  supermercado:  'Supermercado',
  hipermercado:  'Hipermercado',
  atacado:       'Atacado',
  marketplace:   'Online',
  delivery:      'Delivery',
}

function formatPrice(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function OfferCard({ offer, index = 0 }) {
  const days = offer.valid_until ? daysUntil(offer.valid_until) : null
  const isUrgent = days !== null && days <= 1

  return (
    <a
      href={offer.product_url || offer.store?.website || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${(index % 20) * 30}ms` }}
      className="animate-fade-up group block rounded-2xl border border-white/8 bg-card card-hover overflow-hidden"
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <img
          src={offer.image_url}
          alt={offer.product_name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = `https://placehold.co/300x200/1a1a23/f97316?text=${encodeURIComponent(offer.product_name.slice(0, 12))}`
          }}
        />

        {/* Discount badge */}
        {offer.discount_pct > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-brand-500 text-white text-xs font-display font-bold px-2 py-1 rounded-lg shadow-lg">
            -{Math.round(offer.discount_pct)}%
          </div>
        )}

        {/* Online badge */}
        {offer.is_online && (
          <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
            Online
          </div>
        )}

        {/* Urgency */}
        {isUrgent && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1">
            <Clock size={10} />
            <span>Oferta termina hoje!</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3.5">
        {/* Categoria */}
        <div className="flex items-center gap-1 mb-1.5">
          <Tag size={10} className="text-brand-400/60" />
          <span className="text-xs text-white/30 font-mono uppercase tracking-wider">{offer.category}</span>
        </div>

        {/* Nome */}
        <h3 className="font-semibold text-sm text-white/90 leading-snug mb-0.5 line-clamp-2 group-hover:text-brand-300 transition-colors">
          {offer.product_name}
        </h3>
        <p className="text-xs text-white/30 mb-3 line-clamp-1">{offer.unit}</p>

        {/* Preço */}
        <div className="flex items-end justify-between">
          <div>
            {offer.old_price > 0 && (
              <p className="text-xs text-white/30 line-through">{formatPrice(offer.old_price)}</p>
            )}
            <p className="text-xl font-display font-bold gradient-text">
              {formatPrice(offer.price)}
            </p>
          </div>

          <div className="text-right">
            {!offer.is_online && offer.distance_km > 0 && (
              <p className="text-xs text-white/40 flex items-center gap-0.5 justify-end mb-0.5">
                <MapPin size={10} />
                {offer.distance_km.toFixed(1)}km
              </p>
            )}
            <ExternalLink size={14} className="text-white/20 group-hover:text-brand-400 transition-colors ml-auto" />
          </div>
        </div>

        {/* Loja */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <img
            src={offer.store?.logo_url}
            alt={offer.store?.name}
            className="w-5 h-5 rounded object-contain"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/60 truncate">{offer.store?.name}</p>
          </div>
          <span className="text-xs text-white/25 shrink-0">
            {STORE_TYPE_LABELS[offer.store?.type] || offer.store?.type}
          </span>
        </div>
      </div>
    </a>
  )
}
