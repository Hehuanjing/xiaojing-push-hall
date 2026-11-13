/**
 * 离线缓存层：服务端不可用时读写 localStorage，保证页面仍然可用。
 * 常量与归一化规则来自 shared/postSchema.js，与服务端保持同源。
 */
import { BODY_MAX, TITLE_MAX, normalizePosts } from '../../shared/postSchema.js'

export { BODY_MAX, TITLE_MAX, normalizePosts }

export const STORAGE_KEY = 'xjjg_posts'

function defaultStorage() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

function resolveStorage(storage) {
  return storage === undefined ? defaultStorage() : storage
}

/** 探测存储是否可读写（隐私模式、被禁用时返回 false） */
export function isStorageAvailable(storage) {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    const probe = '__xjjg_probe__'
    target.setItem(probe, '1')
    target.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** 读取缓存；存储不可用或数据损坏时返回空数组 */
export function readPosts(storage) {
  const target = resolveStorage(storage)
  if (!target) return []
  try {
    const raw = target.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizePosts(JSON.parse(raw))
  } catch {
    return []
  }
}

/** 写入缓存；失败时返回错误信息而不抛出异常 */
export function writePosts(list, storage) {
  const target = resolveStorage(storage)
  if (!target) return { ok: false, error: '当前环境不支持本地存储' }
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(list))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : '本地存储写入失败'
    }
  }
}
