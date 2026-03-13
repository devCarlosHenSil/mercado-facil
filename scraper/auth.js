/**
 * Gerenciador de credenciais e sessões autenticadas
 * Lê de credentials.json (nunca hardcoded no código)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { log, sleep } from './search-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDS_FILE = path.join(__dirname, 'credentials.json')
const SESSIONS_FILE = path.join(__dirname, 'sessions.json')

// ─── Carrega credenciais do arquivo ──────────────────────────────────────
export function loadCredentials() {
  if (!fs.existsSync(CREDS_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'))
  } catch { return {} }
}

// ─── Salva/carrega sessões (cookies) ─────────────────────────────────────
export function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) return {}
  try {
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'))
    // Remove sessões expiradas (>12h)
    const now = Date.now()
    for (const [key, s] of Object.entries(data)) {
      if (now - s.ts > 12 * 60 * 60 * 1000) delete data[key]
    }
    return data
  } catch { return {} }
}

export function saveSession(storeId, cookies) {
  const sessions = loadSessions()
  sessions[storeId] = { cookies, ts: Date.now() }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
}

// ─── Restaura cookies em uma página ──────────────────────────────────────
export async function restoreSession(page, storeId) {
  const sessions = loadSessions()
  const session = sessions[storeId]
  if (!session?.cookies?.length) return false
  try {
    await page.setCookie(...session.cookies)
    log.gray(`Sessão restaurada: ${storeId}`)
    return true
  } catch { return false }
}

// ─── Login por loja ───────────────────────────────────────────────────────
export async function loginStore(page, storeId) {
  const creds = loadCredentials()
  const c = creds[storeId]
  if (!c?.email || !c?.password) return false // sem credenciais

  log.info(`Fazendo login: ${storeId}`)

  try {
    switch (storeId) {
      case 'atacadao':     return await loginAtacadao(page, c)
      case 'carrefour':    return await loginCarrefour(page, c)
      case 'assai':        return await loginAssai(page, c)
      case 'paodeacucar':  return await loginPaodeacucar(page, c)
      case 'paguemenos':   return await loginPagueMenos(page, c)
      case 'tenda':        return await loginTenda(page, c)
      case 'saovicente':   return await loginSaoVicente(page, c)
      default: return false
    }
  } catch (e) {
    log.warn(`Login falhou (${storeId}): ${e.message}`)
    return false
  }
}

// ─── Login Atacadão ───────────────────────────────────────────────────────
async function loginAtacadao(page, { email, password }) {
  await page.goto('https://www.atacadao.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"],input[id*="email"]', email, { delay: 60 })
  await page.type('input[type="password"],input[name*="password"],input[id*="pass"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('atacadao', cookies)
  log.ok('Atacadão: login OK')
  return true
}

// ─── Login Carrefour ──────────────────────────────────────────────────────
async function loginCarrefour(page, { email, password }) {
  await page.goto('https://mercado.carrefour.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"]', email, { delay: 60 })
  const nextBtn = await page.$('button[type="submit"],button[class*="next"],button[class*="continue"]')
  if (nextBtn) { await nextBtn.click(); await sleep(1000) }
  await page.type('input[type="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('carrefour', cookies)
  log.ok('Carrefour: login OK')
  return true
}

// ─── Login Assaí ──────────────────────────────────────────────────────────
async function loginAssai(page, { email, password }) {
  await page.goto('https://www.assai.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"]', email, { delay: 60 })
  await page.type('input[type="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('assai', cookies)
  log.ok('Assaí: login OK')
  return true
}

// ─── Login Pão de Açúcar ──────────────────────────────────────────────────
async function loginPaodeacucar(page, { email, password }) {
  await page.goto('https://www.paodeacucar.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"]', email, { delay: 60 })
  const nextBtn = await page.$('button[type="submit"]')
  if (nextBtn) { await nextBtn.click(); await sleep(1000) }
  await page.type('input[type="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('paodeacucar', cookies)
  log.ok('Pão de Açúcar: login OK')
  return true
}

// ─── Login Pague Menos ────────────────────────────────────────────────────
async function loginPagueMenos(page, { email, password }) {
  await page.goto('https://www.superpaguemenos.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"],input[name*="login"]', email, { delay: 60 })
  await page.type('input[type="password"],input[name*="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('paguemenos', cookies)
  log.ok('Pague Menos: login OK')
  return true
}

// ─── Login Tenda ──────────────────────────────────────────────────────────
async function loginTenda(page, { email, password }) {
  await page.goto('https://www.tendaatacado.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"]', email, { delay: 60 })
  await page.type('input[type="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('tenda', cookies)
  log.ok('Tenda: login OK')
  return true
}

// ─── Login São Vicente ────────────────────────────────────────────────────
async function loginSaoVicente(page, { email, password }) {
  await page.goto('https://www.svicente.com.br/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(1500)
  await page.type('input[type="email"],input[name*="email"]', email, { delay: 60 })
  await page.type('input[type="password"]', password, { delay: 60 })
  await page.keyboard.press('Enter')
  await sleep(2500)
  const cookies = await page.cookies()
  saveSession('saovicente', cookies)
  log.ok('São Vicente: login OK')
  return true
}
