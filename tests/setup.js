import { afterEach, beforeEach, vi } from 'vitest'

function hasLocalStorage() {
  return typeof localStorage !== 'undefined' && localStorage !== null
}

beforeEach(() => {
  if (hasLocalStorage()) localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (hasLocalStorage()) localStorage.clear()
})
