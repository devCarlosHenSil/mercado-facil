import axios from 'axios'
const api = axios.create({ baseURL: '', timeout: 180000 }) // 90s para dar tempo do scraping

export const searchPrices = (query, stores) =>
  api.post('/api/search', { query, stores: stores?.length ? stores : undefined }).then(r => r.data)

export const getStores = () =>
  api.get('/api/stores').then(r => r.data)

export default api
