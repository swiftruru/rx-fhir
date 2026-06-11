/**
 * 把 Markdown 報告轉成 PDF：marked 先轉 HTML，再用 Playwright 列印成 PDF。
 * （Playwright 已是 repo 既有依賴；不另裝瀏覽器。）
 */
import { marked } from 'marked'
import { launchChromium } from '../browser.js'

const STYLE = `
  body { font-family: "PingFang TC","Microsoft JhengHei","Noto Sans TC",-apple-system,sans-serif; line-height: 1.6; color: #1a1a1a; padding: 8px 4px; }
  h1 { font-size: 22px; border-bottom: 2px solid #d4779a; padding-bottom: 6px; }
  h2 { font-size: 17px; margin-top: 22px; color: #8e3b5a; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  h3 { font-size: 14px; margin-top: 16px; }
  blockquote { color: #555; border-left: 3px solid #ddd; margin: 6px 0; padding: 2px 10px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 6px 0; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
  th { background: #f6e8ee; }
  code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
  pre { background: #f7f7f7; padding: 8px; border-radius: 6px; overflow-x: auto; font-size: 11px; }
  img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
`

export async function renderPdf(markdown: string, outPath: string): Promise<void> {
  const bodyHtml = await marked.parse(markdown)
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${bodyHtml}</body></html>`
  const browser = await launchChromium()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' }
    })
  } finally {
    await browser.close()
  }
}
