/**
 * Scrapers de busca — usando Puppeteer com Chrome do sistema
 */
import { parsePrice, log, sleep } from './search-utils.js'
import { restoreSession, loginStore } from './auth.js'

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

const ITU_CEP = '13300-000'

// Fecha popups de CEP/localização e preenche com CEP de Itu
async function handleCepPopup(page) {
  try {
    // Fecha modal genérico (botão X ou Fechar)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button,a'))
      const close = btns.find(b => /fechar|close|×|✕|não|agora/i.test(b.textContent))
      if (close) close.click()
    })
    await new Promise(r => setTimeout(r, 300))

    // Preenche campo de CEP se existir
    const cepInput = await page.$('input[placeholder*="CEP"],input[placeholder*="cep"],input[name*="cep"],input[name*="CEP"],input[id*="cep"]')
    if (cepInput) {
      await cepInput.click({ clickCount: 3 })
      await cepInput.type(ITU_CEP, { delay: 80 })
      await page.keyboard.press('Enter')
      await new Promise(r => setTimeout(r, 1200))
    }
  } catch (_) {}
}

// ── Extrator genérico que funciona na maioria dos sites VTEX ──────────────
async function extractVtex(page, store, query) {
  const results = []

  // Fecha popup de CEP se aparecer
  await handleCepPopup(page)

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
      // Imagem: usa URL absoluta sempre para evitar CORS
      let imgUrl = sku.images?.[0]?.imageUrl || ''
      if (imgUrl && !imgUrl.startsWith('http')) imgUrl = store.website + imgUrl
      imgUrl = imgUrl.replace(/-\d+-\d+\./, '-300-300.')
      results.push(makeResult(store, item.productName, offer.Price, {
        old_price: offer.ListPrice > offer.Price ? offer.ListPrice : 0,
        image_url: imgUrl,
        product_url: store.website + '/' + (item.linkText || '') + '/p',
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
        img: img?.dataset?.src || img?.src || img?.getAttribute('data-src') || img?.getAttribute('data-lazy-src') || '',
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
  logo_url: 'https://mercado.carrefour.com.br/favicon.ico',
  type: 'hipermercado', website: 'https://mercado.carrefour.com.br',
}
export async function searchCarrefour(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'carrefour')
    await page.goto('https://mercado.carrefour.com.br/s?q=' + encodeURIComponent(query) + '&sort=score_desc', { waitUntil: 'domcontentloaded', timeout: 28000 })
    await sleep(2500)
    await handleCepPopup(page)
    const results = await extractVtex(page, CARREFOUR, query)
    log.ok('Carrefour: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Carrefour: ' + e.message); return [] }
}

// ─── ATACADÃO ─────────────────────────────────────────────────────────────
const ATACADAO = {
  id: 'atacadao', name: 'Atacadao',
  logo_url: 'https://www.atacadao.com.br/favicon.ico',
  type: 'atacado', website: 'https://www.atacadao.com.br',
}
export async function searchAtacadao(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'atacadao')
    await page.goto('https://www.atacadao.com.br/s?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 20000 })
    await sleep(2000)
    // Dismiss CEP popup
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const skip = btns.find(b => /agora não|fechar|pular|skip|close/i.test(b.textContent))
      if (skip) skip.click()
    }).catch(() => {})
    await sleep(500)
    const results = await extractVtex(page, ATACADAO, query)
    log.ok('Atacadao: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Atacadao: ' + e.message); return [] }
}

// ─── ASSAÍ ────────────────────────────────────────────────────────────────
const ASSAI = {
  id: 'assai', name: 'Assai Atacadista',
  logo_url: 'https://www.assai.com.br/favicon.ico',
  type: 'atacado', website: 'https://www.assai.com.br',
}
export async function searchAssai(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'assai')
    await page.goto('https://www.assai.com.br/busca?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 25000 })
    await sleep(2500)
    const results = await extractVtex(page, ASSAI, query)
    log.ok('Assai: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Assai: ' + e.message); return [] }
}

// ─── PÃO DE AÇÚCAR ────────────────────────────────────────────────────────
const PDA = {
  id: 'paodeacucar', name: 'Pao de Acucar',
  logo_url: 'https://www.paodeacucar.com/favicon.ico',
  type: 'supermercado', website: 'https://www.paodeacucar.com',
}
export async function searchPaodeacucar(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'paodeacucar')
    await page.goto('https://www.paodeacucar.com/s?q=' + encodeURIComponent(query) + '&sort=score_desc&page=1', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await sleep(2500)
    await handleCepPopup(page)
    const results = await extractVtex(page, PDA, query)
    log.ok('Pao de Acucar: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Pao de Acucar: ' + e.message); return [] }
}

// ─── PAGUE MENOS ─────────────────────────────────────────────────────────
const PAGUE_MENOS = {
  id: 'paguemenos', name: 'Supermercados Pague Menos',
  logo_url: 'https://www.superpaguemenos.com.br/favicon.ico',
  type: 'supermercado', website: 'https://www.superpaguemenos.com.br',
}
export async function searchPagueMenos(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'paguemenos')
    await page.goto('https://www.superpaguemenos.com.br/' + encodeURIComponent(query) + '?map=ft', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(2000)
    // Force lazy images to load by scrolling
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 400)
        await new Promise(r => setTimeout(r, 300))
      }
      window.scrollTo(0, 0)
    })
    await sleep(800)
    const results = await extractVtex(page, PAGUE_MENOS, query)
    // Fix lazy-loaded images: replace data-src with src
    for (const r of results) {
      if (!r.image_url || r.image_url.includes('data:image')) r.image_url = ''
    }
    log.ok('Pague Menos: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Pague Menos: ' + e.message); return [] }
}

// ─── TENDA ────────────────────────────────────────────────────────────────
const TENDA = {
  id: 'tenda', name: 'Tenda Atacadista',
  logo_url: 'https://www.tendaatacado.com.br/favicon.ico',
  type: 'atacado', website: 'https://www.tendaatacado.com.br',
}
export async function searchTenda(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'tenda')
    await page.goto('https://www.tendaatacado.com.br/busca?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 20000 })
    await sleep(2000)
    const results = await extractVtex(page, TENDA, query)
    log.ok('Tenda: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Tenda: ' + e.message); return [] }
}

// ─── SÃO VICENTE ─────────────────────────────────────────────────────────
const SAO_VICENTE = {
  id: 'saovicente', name: 'Supermercados Sao Vicente',
  logo_url: 'https://www.svicente.com.br/favicon.ico',
  type: 'supermercado', website: 'https://www.svicente.com.br',
}
export async function searchSaoVicente(query, page) {
  try {
        // Restaura sessão autenticada se disponível
    await restoreSession(page, 'saovicente')
    await page.goto('https://www.svicente.com.br/busca?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 20000 })
    await sleep(2000)
    // Fecha modal de CEP e loja
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button,a,[class*="close"],[class*="fechar"]'))
      const close = btns.find(b => /fechar|×|✕|depois|agora não|skip/i.test(b.textContent) || b.getAttribute('aria-label')?.match(/close|fechar/i))
      if (close) close.click()
    }).catch(() => {})
    await sleep(600)
    const results = await extractVtex(page, SAO_VICENTE, query)
    log.ok('Sao Vicente: ' + results.length + ' resultados')
    return results
  } catch(e) { log.warn('Sao Vicente: ' + e.message); return [] }
}

export const ALL_SEARCHERS = [
  { id: 'carrefour',   fn: searchCarrefour,   store: CARREFOUR },
  { id: 'atacadao',    fn: searchAtacadao,    store: ATACADAO },
  { id: 'assai',       fn: searchAssai,       store: ASSAI },
  { id: 'paodeacucar', fn: searchPaodeacucar, store: PDA },
  { id: 'paguemenos',  fn: searchPagueMenos,  store: PAGUE_MENOS },
  { id: 'tenda',       fn: searchTenda,       store: TENDA },
  { id: 'saovicente',  fn: searchSaoVicente,  store: SAO_VICENTE },
]
