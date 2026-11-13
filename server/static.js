import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'

/**
 * 为 Hono app 挂载前端构建产物与 SPA fallback。
 * 启动时读一次 index.html，避免每个页面请求都做同步 IO。
 */
export function withStatic(app, { distDir = resolve(process.cwd(), 'dist') } = {}) {
  const indexFile = resolve(distDir, 'index.html')
  const indexHtml = existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : ''

  app.use('*', serveStatic({ root: distDir }))

  app.get('*', (c) => {
    // 带扩展名的静态资源缺失时返回 404，避免把 HTML 当作 JS/CSS 返回
    if (/\.[a-z0-9]+$/i.test(c.req.path)) return c.text('资源不存在', 404)
    if (!indexHtml) {
      return c.text('未找到 dist/index.html，请先运行 npm run build', 503)
    }
    return c.html(indexHtml)
  })

  return app
}
