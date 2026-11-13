import { describe, expect, it } from 'vitest'
import { HOT_TOPICS } from '../../src/data/hotTopics.js'
import { buildHotList } from '../../src/utils/hotTopics.js'

const day = new Date(2026, 10, 13)

describe('HOT_TOPICS', () => {
  it('内置 10 条热点，包含标题与分类', () => {
    expect(HOT_TOPICS).toHaveLength(10)
    HOT_TOPICS.forEach((topic) => {
      expect(typeof topic.title).toBe('string')
      expect(topic.title.length).toBeGreaterThan(0)
      expect(typeof topic.cat).toBe('string')
    })
  })
})

describe('buildHotList', () => {
  it('返回与热点数量一致的列表并带上热度', () => {
    const list = buildHotList({ date: day })
    expect(list).toHaveLength(10)
    list.forEach((item) => {
      expect(typeof item.heat).toBe('number')
      expect(item.heat).toBeGreaterThanOrEqual(60)
      expect(item.heat).toBeLessThanOrEqual(82)
    })
  })

  it('按热度降序排列', () => {
    const heats = buildHotList({ date: day }).map((item) => item.heat)
    const sorted = [...heats].sort((a, b) => b - a)
    expect(heats).toEqual(sorted)
  })

  it('同一天的结果稳定，不同日期热度不同', () => {
    expect(buildHotList({ date: day })).toEqual(buildHotList({ date: new Date(2026, 10, 13, 20) }))
    const nextDay = buildHotList({ date: new Date(2026, 10, 14) })
    expect(nextDay.map((item) => item.heat)).not.toEqual(
      buildHotList({ date: day }).map((item) => item.heat)
    )
  })

  it('不修改原始热点数据', () => {
    const snapshot = HOT_TOPICS.map((topic) => ({ ...topic }))
    buildHotList({ date: day })
    expect(HOT_TOPICS).toEqual(snapshot)
  })

  it('可注入自定义热点集合', () => {
    const list = buildHotList({
      date: day,
      topics: [
        { title: 'A', cat: '科技' },
        { title: 'B', cat: '社会' }
      ]
    })
    expect(list).toHaveLength(2)
    expect(list.map((item) => item.title).sort()).toEqual(['A', 'B'])
  })
})
