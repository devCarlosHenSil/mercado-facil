/**
 * Utilitários de busca e comparação de preços
 */

// ─── Parse de preço BR ────────────────────────────────────────────────────
export function parsePrice(str) {
  if (!str) return 0
  const clean = String(str).replace(/[^\d,\.]/g, '')
  if (!clean) return 0
  if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(clean) || 0
}

// ─── Normaliza texto para comparação ─────────────────────────────────────
export function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Score de similaridade entre dois nomes de produto ───────────────────
// Retorna 0-1 onde 1 = mesmo produto
export function similarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0

  const wordsA = new Set(na.split(' ').filter(w => w.length > 2))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 2))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let matches = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) matches++
    else {
      // Partial match: "arroz" matches "arrozes"
      for (const wb of wordsB) {
        if (w.startsWith(wb) || wb.startsWith(w)) { matches += 0.7; break }
      }
    }
  }

  return matches / Math.max(wordsA.size, wordsB.size)
}

// ─── Extrai quantidade/unidade do nome do produto ─────────────────────────
export function extractUnit(name) {
  const m = name.match(/(\d+[\.,]?\d*)\s*(kg|g|ml|l|lt|un|cx|pct|pc|unid|litro|grama|quilo)/i)
  if (!m) return null
  const val = parseFloat(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  // Normaliza para grama/ml
  if (['kg','quilo'].includes(unit)) return { val: val * 1000, unit: 'g' }
  if (['l','lt','litro'].includes(unit)) return { val: val * 1000, unit: 'ml' }
  return { val, unit }
}


// ─── Detecta produtos indisponíveis ──────────────────────────────────────
const UNAVAILABLE_TERMS = [
  'indisponivel', 'indisponível', 'esgotado', 'sem estoque', 'fora de estoque',
  'produto indisponivel', 'nao disponivel', 'out of stock', 'unavailable'
]

export function isUnavailable(name, extra = '') {
  const text = normalize(name + ' ' + extra)
  return UNAVAILABLE_TERMS.some(t => text.includes(normalize(t)))
}

// ─── Verifica se o produto bate com a unidade buscada ────────────────────
// ex: busca "arroz 5kg" → produto "arroz 1kg" retorna false
export function matchesUnit(query, productName) {
  const qUnit = extractUnit(query)
  if (!qUnit) return true // query sem unidade = aceita qualquer
  const pUnit = extractUnit(productName)
  if (!pUnit) return true // produto sem unidade = aceita
  if (qUnit.unit !== pUnit.unit) return true // unidades diferentes = não compara
  // Tolera ±20% de diferença de peso
  const ratio = qUnit.val / pUnit.val
  return ratio >= 0.7 && ratio <= 1.4
}

// ─── Agrupa resultados de múltiplas lojas pelo mesmo produto ──────────────
export function groupByProduct(results, minSimilarity = 0.55) {
  const groups = []

  for (const result of results) {
    let bestGroup = null
    let bestScore = 0

    for (const group of groups) {
      const score = similarity(result.product_name, group.canonical_name)
      if (score > bestScore && score >= minSimilarity) {
        bestScore = score
        bestGroup = group
      }
    }

    if (bestGroup) {
      bestGroup.results.push(result)
      bestGroup.results.sort((a, b) => a.price - b.price)
      bestGroup.best_price = bestGroup.results[0].price
      bestGroup.best_store = bestGroup.results[0].store.name
      bestGroup.savings = bestGroup.results.length > 1
        ? bestGroup.results[bestGroup.results.length - 1].price - bestGroup.results[0].price
        : 0
    } else {
      groups.push({
        id: normalize(result.product_name).replace(/\s+/g, '-').slice(0, 50),
        canonical_name: result.product_name,
        results: [result],
        best_price: result.price,
        best_store: result.store.name,
        savings: 0,
      })
    }
  }

  // Ordena grupos por economia potencial (quem tem mais variação de preço primeiro)
  return groups.sort((a, b) => b.savings - a.savings)
}

// ─── Logger ───────────────────────────────────────────────────────────────
const C = { reset:'\x1b[0m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m' }
export const log = {
  info:  msg => console.log(`${C.cyan}[INFO]${C.reset} ${msg}`),
  ok:    msg => console.log(`${C.green}[OK]${C.reset} ${msg}`),
  warn:  msg => console.log(`${C.yellow}[WARN]${C.reset} ${msg}`),
  error: msg => console.log(`${C.red}[ERR]${C.reset} ${msg}`),
  gray:  msg => console.log(`${C.gray}${msg}${C.reset}`),
}

export const sleep = ms => new Promise(r => setTimeout(r, ms))
