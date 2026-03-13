import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Geolocalização
  location: null,        // { lat, lng, city, state }
  locationError: null,
  locationLoading: false,

  // Busca
  query: '',
  category: 'todos',
  sortBy: 'relevance',
  radius: 10,

  // Resultados
  offers: [],
  total: 0,
  page: 1,
  hasMore: false,
  loading: false,
  error: null,
  queryTime: 0,

  // Lojas próximas
  nearbyStores: [],
  storesLoading: false,

  // Filtros UI
  sidebarOpen: false,

  // Actions
  setLocation: (loc) => set({ location: loc, locationError: null }),
  setLocationError: (err) => set({ locationError: err }),
  setLocationLoading: (v) => set({ locationLoading: v }),

  setQuery: (q) => set({ query: q, page: 1 }),
  setCategory: (c) => set({ category: c, page: 1 }),
  setSortBy: (s) => set({ sortBy: s, page: 1 }),
  setRadius: (r) => set({ radius: r, page: 1 }),

  setOffers: (data) => set({
    offers: data.offers,
    total: data.total,
    hasMore: data.has_more,
    queryTime: data.query_time_ms,
    page: data.page,
  }),

  appendOffers: (data) => set((state) => ({
    offers: [...state.offers, ...data.offers],
    hasMore: data.has_more,
    page: data.page,
    queryTime: data.query_time_ms,
  })),

  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  incrementPage: () => set((s) => ({ page: s.page + 1 })),

  setNearbyStores: (stores) => set({ nearbyStores: stores }),
  setStoresLoading: (v) => set({ storesLoading: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  reset: () => set({ offers: [], total: 0, page: 1, hasMore: false, error: null }),
}))
