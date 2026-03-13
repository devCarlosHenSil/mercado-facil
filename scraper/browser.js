import puppeteer from 'puppeteer-core'

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

let _browser = null

export async function getBrowser() {
  if (_browser) { try { await _browser.pages(); return _browser } catch { _browser = null } }
  _browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox','--disable-gpu','--ignore-certificate-errors'],
  })
  return _browser
}

export async function newPage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1366, height: 768 })
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' })
  return page
}

export async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null }
}