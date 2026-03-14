import express from 'express'
import { ALL_SEARCHERS } from './search-scrapers.js'
import { newPage } from './browser.js'
import { isUnavailable, log, sleep } from './search-utils.js'

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000
let activeSearches = 0
const MAX_CONCURRENT = 3
const STORE_TIMEOUT = 15000

app.post('/search', async (req, res) => {
  const query = (req.body?.query || '').trim()
  if (!query || query.length < 2) return res.status(400).json({ error: 'Query muito curta' })

  const cacheKey = query.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    log.gray('Cache hit: "' + query + '"')
    return res.json({ ...cached.data, from_cache: true })
  }

  if (activeSearches >= MAX_CONCURRENT)
    return res.status(429).json({ error: 'Muitas buscas simultaneas. Aguarde.', retry_after: 5 })

  activeSearches++
  const t0 = Date.now()
  log.info('Buscando: "' + query + '" (' + activeSearches + ' ativas)')

  const storeFilter = req.body?.stores
  const searchers = storeFilter ? ALL_SEARCHERS.filter(s => storeFilter.includes(s.id)) : ALL_SEARCHERS
  const allResults = []
  const storeStatus = {}

  const promises = searchers.map(async ({ id, fn, store }) => {
    const page = await newPage()
    const timer = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ' + (STORE_TIMEOUT/1000) + 's')), STORE_TIMEOUT)
    )
    try {
      const results = await Promise.race([fn(query, page), timer])
      storeStatus[id] = { ok: true, count: results.length, name: store.name, logo: store.logo_url }
      return results
    } catch (err) {
      log.warn(store.name + ': ' + err.message)
      storeStatus[id] = { ok: false, count: 0, name: store.name, logo: store.logo_url, error: err.message }
      return []
    } finally {
      await page.close().catch(() => {})
    }
  })

  const settled = await Promise.allSettled(promises)
  for (const r of settled) if (r.status === 'fulfilled') allResults.push(...r.value)

  activeSearches--

  const valid = allResults.filter(r =>
    r.product_name && r.product_name.length > 2 &&
    r.price > 0 && r.price < 10000 &&
    !isUnavailable(r.product_name)
  )

  // Agrupa por loja — todos os produtos de cada loja
  const byStore = {}
  for (const r of valid) {
    const sid = r.store.id
    if (!byStore[sid]) byStore[sid] = { store: r.store, products: [] }
    byStore[sid].products.push(r)
  }
  for (const s of Object.values(byStore)) {
    s.products.sort((a, b) => a.price - b.price)
  }
  const storeGroups = Object.values(byStore).sort((a, b) => a.products[0].price - b.products[0].price)

  const elapsed = Date.now() - t0
  log.ok('"' + query + '": ' + valid.length + ' resultados em ' + elapsed + 'ms — ' + storeGroups.length + ' lojas')

  const response = {
    query,
    total_results: valid.length,
    total_groups: storeGroups.length,
    elapsed_ms: elapsed,
    from_cache: false,
    stores: storeStatus,
    storeGroups,
    flat: valid
  }

  if (valid.length > 0) cache.set(cacheKey, { data: response, ts: Date.now() })
  res.json(response)
})

app.get('/health', (_, res) => res.json({
  ok: true, active_searches: activeSearches, cache_size: cache.size,
  stores: ALL_SEARCHERS.map(s => ({ id: s.id, name: s.store.name }))
}))

app.get('/stores', (_, res) => res.json(
  ALL_SEARCHERS.map(s => ({ id: s.id, name: s.store.name, logo_url: s.store.logo_url, type: s.store.type, website: s.store.website }))
))

app.delete('/cache', (_, res) => { cache.clear(); res.json({ ok: true }) })

app.listen(3001, () => {
  log.ok('MercadoFacil Search — http://localhost:3001')
  log.info('Lojas: ' + ALL_SEARCHERS.map(s => s.id).join(', '))
})
