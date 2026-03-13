/**
 * MercadoFácil — Serviço de Busca de Preços em Tempo Real
 * Porta 3001
 */
import express from 'express'
import { ALL_SEARCHERS } from './search-scrapers.js'
import { newPage } from './browser.js'
import { groupByProduct, isUnavailable, matchesUnit, log, sleep } from './search-utils.js'

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
    return res.status(429).json({ error: 'Muitas buscas simultâneas. Aguarde.', retry_after: 5 })

  activeSearches++
  const t0 = Date.now()
  log.info('Buscando: "' + query + '" (' + activeSearches + ' ativas)')

  const storeFilter = req.body?.stores
  const searchers = storeFilter ? ALL_SEARCHERS.filter(s => storeFilter.includes(s.id)) : ALL_SEARCHERS

  const BATCH = 4
  const allResults = []
  const storeStatus = {}

  for (let i = 0; i < searchers.length; i += BATCH) {
    const batch = searchers.slice(i, i + BATCH)
    const promises = batch.map(async ({ id, fn, store }) => {
      const page = await newPage()
      try {
        const results = await fn(query, page)
        storeStatus[id] = { ok: true, count: results.length, name: store.name, logo: store.logo_url }
        return results
      } catch (err) {
        log.error(store.name + ': ' + err.message)
        storeStatus[id] = { ok: false, count: 0, name: store.name, logo: store.logo_url, error: err.message }
        return []
      } finally {
        await page.close().catch(() => {})
      }
    })
    const settled = await Promise.allSettled(promises)
    for (const r of settled) if (r.status === 'fulfilled') allResults.push(...r.value)
    if (i + BATCH < searchers.length) await sleep(400)
  }

  activeSearches--

  const valid = allResults.filter(r =>
    r.product_name?.length > 2 &&
    r.price > 0 &&
    r.price < 10000 &&
    !isUnavailable(r.product_name) &&
    matchesUnit(query, r.product_name)
  )
  const groups = groupByProduct(valid)
  const elapsed = Date.now() - t0
  log.ok('"' + query + '": ' + valid.length + ' resultados em ' + elapsed + 'ms — ' + groups.length + ' grupos')

  const response = { query, total_results: valid.length, total_groups: groups.length,
    elapsed_ms: elapsed, from_cache: false, stores: storeStatus, groups, flat: valid }

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
  log.ok('MercadoFácil Search — http://localhost:3001')
  log.info('Lojas: ' + ALL_SEARCHERS.map(s => s.id).join(', '))
})
