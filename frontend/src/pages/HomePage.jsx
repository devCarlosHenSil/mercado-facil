import { useStore } from '../store/useStore'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSearch } from '../hooks/useSearch'
import Header from '../components/Header'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import SortRadiusBar from '../components/SortRadiusBar'
import OffersGrid from '../components/OffersGrid'
import NearbyStoresList from '../components/NearbyStoresList'
import LocationGate from '../components/LocationGate'

export default function HomePage() {
  useGeolocation()
  useSearch()
  const { location, locationLoading, sidebarOpen, setSidebarOpen } = useStore()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {!location && !locationLoading ? (
          <LocationGate />
        ) : (
          <>
            {locationLoading && (
              <div className="text-center py-10">
                <h1 className="font-display text-4xl font-bold mb-2">
                  As melhores <span className="gradient-text">ofertas</span> perto de você
                </h1>
                <p className="text-white/40">Obtendo sua localização...</p>
              </div>
            )}
            {location && (
              <div className="flex gap-6">
                <aside className={`shrink-0 w-64 space-y-6 lg:block ${sidebarOpen ? 'block fixed inset-y-0 left-0 z-40 w-72 bg-surface p-5 pt-20 overflow-y-auto' : 'hidden'}`}>
                  <NearbyStoresList />
                </aside>
                {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setSidebarOpen(false)} />}
                <div className="flex-1 min-w-0 space-y-4">
                  <SearchBar />
                  <CategoryFilter />
                  <SortRadiusBar />
                  <OffersGrid />
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="text-center py-6 text-xs text-white/15 border-t border-white/5">
        <p>MercadoFácil · Ofertas de supermercados, atacados e hipermercados</p>
      </footer>
    </div>
  )
}
