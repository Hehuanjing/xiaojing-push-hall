// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../../server/app.js'
import { createMemoryStore } from '../../server/store.js'
import { withStatic } from '../../server/static.js'

let distDir
let app

beforeAll(() => {
  distDir = mkdtempSync(join(tmpdir(), 'xjjg-dist-'))
  mkdirSync(join(distDir, 'assets'))
  writeFileSync(
    join(distDir, 'index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>'
  )
  writeFileSync(join(distDir, 'assets', 'app.js'), 'console.log("ok")')

  const api = createApp({ store: createMemoryStore({ now: () => 1_700_000_000_000 }) })
  app = withStatic(api, { distDir })
})

afterAll(() => {
  rmSync(distDir, { recursive: true, force: true })
})

describe('前端静态托管', () => {
  it('根路径返回 index.html', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('<div id="app"></div>')
  })

  it('静态资源按原 content-type 返回', async () => {
    const res = await app.request('/assets/app.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('javascript')
    expect(await res.text()).toContain('console.log')
  })

  it('未知前端路由回退到 index.html（SPA 刷新可用）', async () => {
    const res = await app.request('/some/deep/route')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<div id="app"></div>')
  })

  it('缺失的带扩展名资源返回 404 而不是 HTML', async () => {
    const res = await app.request('/assets/missing.css')
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('资源不存在')
  })

  it('API 请求不会被 SPA fallback 吞掉', async () => {
    const posts = await app.request('/api/posts')
    expect(posts.status).toBe(200)
    expect((await posts.json()).posts).toHaveLength(3)

    const bare = await app.request('/api')
    expect(bare.status).toBe(404)
    expect(bare.headers.get('content-type')).toContain('application/json')
    expect(await bare.json()).toEqual({ message: '接口不存在' })
  })

  it('未构建时给出可读提示', async () => {
    const empty = withStatic(createApp({ store: createMemoryStore() }), {
      distDir: join(distDir, 'not-built')
    })
    const res = await empty.request('/')
    expect(res.status).toBe(503)
    expect(await res.text()).toContain('npm run build')
  })
})
