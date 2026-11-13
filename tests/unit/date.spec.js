import { describe, expect, it } from 'vitest'
import { formatDateChip, formatTime } from '../../src/utils/date.js'

describe('formatTime', () => {
  it('把时间戳格式化为 YYYY-MM-DD HH:mm', () => {
    const ts = new Date(2026, 10, 13, 9, 5).getTime()
    expect(formatTime(ts)).toBe('2026-11-13 09:05')
  })

  it('月、日、时、分都补零', () => {
    const ts = new Date(2026, 0, 1, 0, 0).getTime()
    expect(formatTime(ts)).toBe('2026-01-01 00:00')
  })
})

describe('formatDateChip', () => {
  it('输出中文日期与星期', () => {
    expect(formatDateChip(new Date(2026, 10, 13))).toBe('2026 年 11 月 13 日 · 星期五')
  })

  it('月日不补零，星期按真实星期计算', () => {
    expect(formatDateChip(new Date(2026, 0, 5))).toBe('2026 年 1 月 5 日 · 星期一')
  })

  it('星期日显示为“星期日”', () => {
    expect(formatDateChip(new Date(2026, 10, 15))).toBe('2026 年 11 月 15 日 · 星期日')
  })
})
