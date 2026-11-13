import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { createMemoryStore } from './store.js'
import { withStatic } from './static.js'

const port = Number.parseInt(process.env.PORT ?? '', 10) || 8787

const app = createApp({ store: createMemoryStore() })

withStatic(app, { distDir: resolve(process.cwd(), 'dist') })

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`小晶推送馆已启动：http://localhost:${info.port}`)
  console.log(`接口示例：GET http://localhost:${info.port}/api/posts`)
})

server.on('error', (error) => {
  console.error('[server] 启动失败:', error?.message || error)
  process.exitCode = 1
})
