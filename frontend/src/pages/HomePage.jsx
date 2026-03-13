import { useGeolocation } from '../hooks/useGeolocation'
import Header from '../components/Header'
import SearchBar from '../components/SearchBar'
import StoreStatusBar from '../components/StoreStatusBar'
import ResultsSection from '../components/ResultsSection'

export default function HomePage() {
  useGeolocation()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Busca */}
        <div className="space-y-1">
          <SearchBar />
          <StoreStatusBar />
        </div>
        {/* Resultados */}
        <ResultsSection />
      </main>
      <footer className="text-center py-6 text-xs text-white/15 border-t border-white/5">
        MercadoFacil — Comparador de precos em tempo real · Itu e região, SP
      </footer>
    </div>
  )
}
