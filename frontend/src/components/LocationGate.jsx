import { MapPin, Navigation, Shield } from 'lucide-react'

export default function LocationGate() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-up">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-pulse" />
          <div className="absolute inset-3 bg-brand-500/30 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin size={36} className="text-brand-400" />
          </div>
        </div>
        <h2 className="font-display text-3xl font-bold mb-3">Onde você está?</h2>
        <p className="text-white/50 mb-8 leading-relaxed">
          Precisamos da sua localização para mostrar as melhores ofertas de supermercados, atacados e hipermercados perto de você.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3">
          <Navigation size={18} /> Permitir localização
        </button>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/25">
          <Shield size={12} /><span>Sua localização nunca é armazenada em servidores</span>
        </div>
      </div>
    </div>
  )
}
