import axios from 'axios'

const api = axios.create({ baseURL: '', timeout: 15000 })

export const searchOffers = (params) =>
  api.get('/api/search', {
    params: {
      q:         params.query || '',
      lat:       params.lat,
      lng:       params.lng,
      radius:    params.radius || 10,
      category:  params.category || '',
      sort:      params.sortBy || 'relevance',
      page:      params.page || 1,
      page_size: 20,
    }
  }).then(r => r.data)

export const getNearbyStores = (lat, lng, radius = 10) =>
  api.get('/api/nearby-stores', { params: { lat, lng, radius } }).then(r => r.data)

export const getCategories = () =>
  api.get('/api/categories').then(r => r.data)

export default api
