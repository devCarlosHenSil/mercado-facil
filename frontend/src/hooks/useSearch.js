import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { searchOffers, getNearbyStores } from '../services/api'

export function useSearch() {
  const {
    location, query, category, sortBy, radius, page,
    setOffers, appendOffers, setLoading, setError, reset,
    setNearbyStores, setStoresLoading,
  } = useStore()

  const timerRef = useRef(null)

  const doSearch = useCallback(async (isAppend = false) => {
    if (!location) return
    if (!isAppend) { setLoading(true); setError(null) }
    try {
      const data = await searchOffers({
        query, lat: location.lat, lng: location.lng,
        radius, category, sortBy, page,
      })
      isAppend ? appendOffers(data) : setOffers(data)
    } catch (err) {
      setError('Erro ao buscar ofertas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [location, query, category, sortBy, radius, page])

  useEffect(() => {
    if (!location) return
    clearTimeout(timerRef.current)
    if (page === 1) reset()
    timerRef.current = setTimeout(() => doSearch(false), query ? 400 : 0)
    return () => clearTimeout(timerRef.current)
  }, [location, query, category, sortBy, radius])

  useEffect(() => {
    if (page > 1) doSearch(true)
  }, [page])

  useEffect(() => {
    if (!location) return
    setStoresLoading(true)
    getNearbyStores(location.lat, location.lng, radius)
      .then(setNearbyStores).catch(() => {}).finally(() => setStoresLoading(false))
  }, [location, radius])
}
