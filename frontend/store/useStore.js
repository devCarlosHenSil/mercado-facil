import {create} from 'zustand'
export const useStore = create((set, get) => ({
	// Localização
	location: null,
	locationError: null,
	locationLoading: false,
	setLocation: (loc) => set(
		{location: loc, locationError: null}
	),
	setLocationError: (err) => set(
		{locationError: err}
	),
	setLocationLoading: (v) => set(
		{locationLoading: v}
	),

	// Busca
	query: '',
	results: null, // resposta completa do /search
	searching: false,
	searchError: null,
	lastQuery: '',

	setQuery: (q) => set(
		{query: q}
	),
	setSearching: (v) => set(
		{searching: v}
	),
	setResults: (r) => set(
		{
			results: r,
			lastQuery: r ?. query || '',
			searchError: null
		}
	),
	setSearchError: (e) => set(
		{searchError: e, searching: false}
	),
	clearResults: () => set(
		{results: null, lastQuery: '', searchError: null}
	),

	// View mode
	viewMode: 'groups', // 'groups' | 'flat'
	setViewMode: (v) => set(
		{viewMode: v}
	),

	// Store filter
	activeStores: [], // [] = todos
	toggleStore: (id) => {
		const curr = get().activeStores
		set({
			activeStores: curr.includes(id) ? curr.filter(s => s !== id) : [
				... curr,
				id
			]
		})
	},
	clearStoreFilter: () => set(
		{activeStores: []}
	)
}))
