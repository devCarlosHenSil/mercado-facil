/**
 * Scrapers de busca — usando Puppeteer com Chrome do sistema
 */
import { parsePrice, log, sleep } from './search-utils.js'
import { newPage } from './browser.js'

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

// ── Extrator genérico que funciona na maioria dos sites VTEX ──────────────
async function extractVtex(page, store, query) {
  const results = []

  // Tenta API VTEX interna (roda dentro do contexto da página)
  const api = await page.evaluate(async (q) => {
    try {
      const r = await fetch('/api/catalog_system/pub/products/search?ft=' + encodeURIComponent(q) + '&_from=0&_to=19', {
        headers: { Accept: 'application/json' }
      })
      if (!r.ok) return null
      const data = await r.json()
      return Array.isArray(data) ? data : null
    } catch { return null }
  }, query)

  if (api && api.length > 0) {
    for (const item of api) {
      const sku = item.items?.[0]
      const offer = sku?.sellers?.[0]?.commertialOffer
      if (!offer?.Price || offer.Price <= 0) continue
      if (offer.AvailableQuantity === 0) continue // produto sem estoque
      results.push(makeResult(store, item.productName, offer.Price, {
        old_price: offer.ListPrice > offer.Price ? offer.ListPrice : 0,
        image_url: (sku.images?.[0]?.imageUrl || '').replace(/-\d+-\d+\./, '-300-300.'),
        product_url: page.url().split('/s?')[0] + '/' + (item.linkText || '') + '/p',
        unit: sku.name || '',
      }))
    }
    return results
  }

  // Fallback: scraping visual genérico
  const items = await page.evaluate(() => {
    // Coleta todos os elementos que parecem cards de produto
    const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
      if (el.children.length < 2 || el.children.length > 20) return false
      const text = el.innerText || ''
      const hasPrice = /R\$\s*\d+/.test(text)
      const hasImg = !!el.querySelector('img')
      const rect = el.getBoundingClientRect()
      const goodSize = rect.width > 100 && rect.height > 150 && rect.height < 700
      return hasPrice && hasImg && goodSize
    })

    // Deduplica por conteúdo
    const seen = new Set()
    const unique = candidates.filter(el => {
      const key = (el.innerText || '').slice(0, 60)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return unique.slice(0, 25).map(el => {
      const img = el.querySelector('img')
      const link = el.querySelector('a[href]') || el.closest('a')

      // Extrai preços: pega todos os textos com R$
      const priceTexts = []
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node
      while (node = walker.nextNode()) {
        const t = node.textContent.trim()
        if (/R\$\s*[\d,\.]+/.test(t)) priceTexts.push(t)
      }

      // Nome: texto mais longo sem R$
      const allTexts = Array.from(el.querySelectorAll('*'))
        .map(e => e.childNodes)
        .reduce((a, n) => [...a, ...n], [])
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .filter(t => t.length > 5 && !/R\$/.test(t))
        .sort((a, b) => b.length - a.length)

      return {
        name: allTexts[0] || '',
        priceTexts,
        img: img?.src || img?.dataset?.src || '',
        href: link?.href || '',
      }
    }).filter(i => i.name.length > 3 && i.priceTexts.length > 0)
  })

  for (const item of items) {
    // Menor preço encontrado no card
    const prices = item.priceTexts.map(t => parsePrice(t)).filter(p => p > 0 && p < 5000)
    if (prices.length === 0) continue
    const price = Math.min(...prices)
    const oldPrice = prices.length > 1 ? Math.max(...prices) : 0
    results.push(makeResult(store, item.name, price, {
      old_price: oldPrice > price ? oldPrice : 0,
      image_url: item.img,
      product_url: item.href || page.url(),
    }))
  }

  return results
}

// ─── SAVEGNAGO ────────────────────────────────────────────────────────────
const SAVEGNAGO = {
  id: 'savegnago', name: 'Savegnago Supermercados',
  logo_url: 'https://www.savegnago.com.br/arquivos/logo-savegnago.png',
  type: 'supermercado', website: 'https://www.savegnago.com.br',
}
export async function searchSavegnago(query, page) {
  try {
    await page.goto('https://www.savegnago.com.br/' + encodeURIComponent(query) + '?map=ft', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(2000)
    const results = await extractVtex(page, SAVEGNAGO, query)
    log.ok('Savegnago: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Savegnago: ' + e.message); return [] }
}

// ─── CARREFOUR ────────────────────────────────────────────────────────────
const CARREFOUR = {
  id: 'carrefour', name: 'Carrefour Online',
  logo_url: 'https://logodownload.org/wp-content/uploads/2018/07/carrefour-logo-0.png',
  type: 'hipermercado', website: 'https://www.carrefour.com.br',
}
export async function searchCarrefour(query, page) {
  try {
    await page.goto('https://www.carrefour.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(3000)
    const results = await extractVtex(page, CARREFOUR, query)
    log.ok('Carrefour: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Carrefour: ' + e.message); return [] }
}

// ─── ATACADÃO ─────────────────────────────────────────────────────────────
const ATACADAO = {
  id: 'atacadao', name: 'Atacadao',
  logo_url: 'https://logodownload.org/wp-content/uploads/2021/09/atacadao-logo-0.png',
  type: 'atacado', website: 'https://www.atacadao.com.br',
}
export async function searchAtacadao(query, page) {
  try {
    await page.goto('https://www.atacadao.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(3000)
    const results = await extractVtex(page, ATACADAO, query)
    log.ok('Atacadao: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Atacadao: ' + e.message); return [] }
}

// ─── ASSAÍ ────────────────────────────────────────────────────────────────
const ASSAI = {
  id: 'assai', name: 'Assai Atacadista',
  logo_url: 'https://logodownload.org/wp-content/uploads/2022/06/assai-atacadista-logo-0.png',
  type: 'atacado', website: 'https://www.assai.com.br',
}
export async function searchAssai(query, page) {
  try {
    await page.goto('https://www.assai.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(3000)
    const results = await extractVtex(page, ASSAI, query)
    log.ok('Assai: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Assai: ' + e.message); return [] }
}

// ─── PÃO DE AÇÚCAR ────────────────────────────────────────────────────────
const PDA = {
  id: 'paodeacucar', name: 'Pao de Acucar',
  logo_url: 'https://logodownload.org/wp-content/uploads/2022/03/pao-de-acucar-logo-0.png',
  type: 'supermercado', website: 'https://www.paodeacucar.com',
}
export async function searchPaodeacucar(query, page) {
  try {
    await page.goto('https://www.paodeacucar.com/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(3000)
    const results = await extractVtex(page, PDA, query)
    log.ok('Pao de Acucar: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Pao de Acucar: ' + e.message); return [] }
}

// ─── PAGUE MENOS ─────────────────────────────────────────────────────────
const PAGUE_MENOS = {
  id: 'paguemenos', name: 'Supermercados Pague Menos',
  logo_url: 'https://www.superpaguemenos.com.br/arquivos/logo-pague-menos.png',
  type: 'supermercado', website: 'https://www.superpaguemenos.com.br',
}
export async function searchPagueMenos(query, page) {
  try {
    await page.goto('https://www.superpaguemenos.com.br/' + encodeURIComponent(query) + '?map=ft', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(2000)
    const results = await extractVtex(page, PAGUE_MENOS, query)
    log.ok('Pague Menos: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Pague Menos: ' + e.message); return [] }
}

// ─── TENDA ────────────────────────────────────────────────────────────────
const TENDA = {
  id: 'tenda', name: 'Tenda Atacadista',
  logo_url: 'https://www.tenda.com/arquivos/tenda-logo.png',
  type: 'atacado', website: 'https://www.tenda.com',
}
export async function searchTenda(query, page) {
  try {
    await page.goto('https://www.tenda.com/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(2000)
    const results = await extractVtex(page, TENDA, query)
    log.ok('Tenda: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Tenda: ' + e.message); return [] }
}

// ─── SÃO VICENTE ─────────────────────────────────────────────────────────
const SAO_VICENTE = {
  id: 'saovicente', name: 'Supermercados Sao Vicente',
  logo_url: 'https://ui-avatars.com/api/?name=SV&background=1e40af&color=fff&bold=true&size=128',
  type: 'supermercado', website: 'https://www.svcompras.com.br',
}
export async function searchSaoVicente(query, page) {
  try {
    await page.goto('https://www.saovicenteonline.com.br/busca?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(2000)
    const results = await extractVtex(page, SAO_VICENTE, query)
    log.ok('Sao Vicente: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Sao Vicente: ' + e.message); return [] }
}

export const ALL_SEARCHERS = [
  { id: 'savegnago',   fn: searchSavegnago,   store: SAVEGNAGO },
  { id: 'carrefour',   fn: searchCarrefour,   store: CARREFOUR },
  { id: 'atacadao',    fn: searchAtacadao,    store: ATACADAO },
  { id: 'assai',       fn: searchAssai,       store: ASSAI },
  { id: 'paodeacucar', fn: searchPaodeacucar, store: PDA },
  { id: 'paguemenos',  fn: searchPagueMenos,  store: PAGUE_MENOS },
  { id: 'tenda',       fn: searchTenda,       store: TENDA },
  { id: 'saovicente',  fn: searchSaoVicente,  store: SAO_VICENTE },
]
