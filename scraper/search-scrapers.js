import { parsePrice, log, sleep } from './search-utils.js'

const makeResult = (store, name, price, opts = {}) => ({
  product_name: name,
  price,
  old_price:    opts.old_price || 0,
  discount_pct: opts.old_price > price ? Math.round((1 - price / opts.old_price) * 100) : 0,
  image_url:    opts.image_url || '',
  product_url:  opts.product_url || store.website,
  unit:         opts.unit || (name.match(/\d+[\.,]?\d*\s*(g|kg|ml|l|un|cx)/i)?.[0] || ''),
  store,
})

function dedupe(results) {
  const seen = new Set()
  return results.filter(r => {
    const k = r.product_name.toLowerCase().slice(0, 40)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function vtexApi(page, store, query) {
  const api = await page.evaluate(async (q) => {
    try {
      const r = await fetch('/api/catalog_system/pub/products/search?ft=' + encodeURIComponent(q) + '&_from=0&_to=24', {
        headers: { Accept: 'application/json' }
      })
      if (!r.ok) return null
      const data = await r.json()
      return Array.isArray(data) && data.length > 0 ? data : null
    } catch { return null }
  }, query)

  if (!api) return null

  const results = []
  for (const item of api) {
    const sku = item.items?.[0]
    const offer = sku?.sellers?.[0]?.commertialOffer
    if (!offer?.Price || offer.Price <= 0) continue
    if (offer.AvailableQuantity === 0) continue
    results.push(makeResult(store, item.productName, offer.Price, {
      old_price: offer.ListPrice > offer.Price ? offer.ListPrice : 0,
      image_url: (sku.images?.[0]?.imageUrl || '').replace(/-\d+-\d+\./, '-300-300.'),
      product_url: page.url().split('/s?')[0] + '/' + (item.linkText || '') + '/p',
      unit: sku.name || '',
    }))
  }
  return results.length > 0 ? results : null
}

const CARREFOUR = {
  id: 'carrefour', name: 'Carrefour Online',
  logo_url: 'https://www.carrefour.com.br/favicon.ico',
  type: 'hipermercado', website: 'https://www.carrefour.com.br',
}
export async function searchCarrefour(query, page) {
  try {
    await page.goto('https://www.carrefour.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, CARREFOUR, query)
    if (api) { const r = dedupe(api); log.ok('Carrefour: ' + r.length + ' resultados'); return r }
    log.ok('Carrefour: 0 resultados'); return []
  } catch(e) { log.warn('Carrefour: ' + e.message); return [] }
}

const ATACADAO = {
  id: 'atacadao', name: 'Atacadao',
  logo_url: 'https://www.atacadao.com.br/favicon.ico',
  type: 'atacado', website: 'https://www.atacadao.com.br',
}
export async function searchAtacadao(query, page) {
  try {
    await page.goto('https://www.atacadao.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, ATACADAO, query)
    if (api) { const r = dedupe(api); log.ok('Atacadao: ' + r.length + ' resultados'); return r }
    log.ok('Atacadao: 0 resultados'); return []
  } catch(e) { log.warn('Atacadao: ' + e.message); return [] }
}

const PDA = {
  id: 'paodeacucar', name: 'Pao de Acucar',
  logo_url: 'https://www.paodeacucar.com/favicon.ico',
  type: 'supermercado', website: 'https://www.paodeacucar.com',
}
export async function searchPaodeacucar(query, page) {
  try {
    await page.goto('https://www.paodeacucar.com/s?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, PDA, query)
    if (api) { const r = dedupe(api); log.ok('Pao de Acucar: ' + r.length + ' resultados'); return r }
    log.ok('Pao de Acucar: 0 resultados'); return []
  } catch(e) { log.warn('Pao de Acucar: ' + e.message); return [] }
}

const PAGUE_MENOS = {
  id: 'paguemenos', name: 'Supermercados Pague Menos',
  logo_url: 'https://www.superpaguemenos.com.br/favicon.ico',
  type: 'supermercado', website: 'https://www.superpaguemenos.com.br',
}
export async function searchPagueMenos(query, page) {
  try {
    await page.goto('https://www.superpaguemenos.com.br/' + encodeURIComponent(query) + '?map=ft', { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, PAGUE_MENOS, query)
    if (api) { const r = dedupe(api); log.ok('Pague Menos: ' + r.length + ' resultados'); return r }
    log.ok('Pague Menos: 0 resultados'); return []
  } catch(e) { log.warn('Pague Menos: ' + e.message); return [] }
}

const TENDA = {
  id: 'tenda', name: 'Tenda Atacadista',
  logo_url: 'https://www.tenda.com/favicon.ico',
  type: 'atacado', website: 'https://www.tenda.com',
}
export async function searchTenda(query, page) {
  try {
    await page.goto('https://www.tenda.com/s?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, TENDA, query)
    if (api) { const r = dedupe(api); log.ok('Tenda: ' + r.length + ' resultados'); return r }
    log.ok('Tenda: 0 resultados'); return []
  } catch(e) { log.warn('Tenda: ' + e.message); return [] }
}

const SAO_VICENTE = {
  id: 'saovicente', name: 'Supermercados Sao Vicente',
  logo_url: 'https://www.svicente.com.br/favicon.ico',
  type: 'supermercado', website: 'https://www.svicente.com.br',
}
export async function searchSaoVicente(query, page) {
  try {
    await page.goto('https://www.svicente.com.br/busca?q=' + encodeURIComponent(query), { waitUntil: 'networkidle2', timeout: 15000 })
    await sleep(800)
    const api = await vtexApi(page, SAO_VICENTE, query)
    if (api) { const r = dedupe(api); log.ok('Sao Vicente: ' + r.length + ' resultados via API'); return r }
    const items = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[class*="product"],[class*="Product"],[class*="item"]'))
        .filter(el => el.querySelector('img') && /R\$/.test(el.innerText))
      return cards.slice(0, 20).map(el => ({
        name: el.querySelector('h3,h2,[class*="name"],[class*="title"],[class*="Name"]')?.textContent?.trim() || '',
        price: (() => {
          const els = el.querySelectorAll('*')
          for (const e of els) {
            if (e.children.length === 0 && /R\$\s*[\d,]+/.test(e.textContent)) return e.textContent.trim()
          }
          return ''
        })(),
        img: el.querySelector('img')?.src || '',
        href: el.querySelector('a[href]')?.href || '',
      })).filter(i => i.name.length > 3 && i.price.includes('R$'))
    })
    const results = []
    for (const i of items) {
      const p = parsePrice(i.price)
      if (p <= 0 || p > 10000) continue
      results.push(makeResult(SAO_VICENTE, i.name, p, { image_url: i.img, product_url: i.href }))
    }
    log.ok('Sao Vicente: ' + results.length + ' resultados via scraping')
    return results
  } catch(e) { log.warn('Sao Vicente: ' + e.message); return [] }
}

export const ALL_SEARCHERS = [
  { id: 'carrefour',   fn: searchCarrefour,   store: CARREFOUR },
  { id: 'atacadao',    fn: searchAtacadao,    store: ATACADAO },
  { id: 'paodeacucar', fn: searchPaodeacucar, store: PDA },
  { id: 'paguemenos',  fn: searchPagueMenos,  store: PAGUE_MENOS },
  { id: 'tenda',       fn: searchTenda,       store: TENDA },
  { id: 'saovicente',  fn: searchSaoVicente,  store: SAO_VICENTE },
]
