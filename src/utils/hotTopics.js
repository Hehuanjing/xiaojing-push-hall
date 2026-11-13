import { HOT_TOPICS } from '../data/hotTopics.js'

export const HEAT_BASE = 60
export const HEAT_RANGE = 23

function daySeed(date) {
  const value = new Date(date)
  return value.getFullYear() * 10000 + (value.getMonth() + 1) * 100 + value.getDate()
}

/**
 * 按日期种子生成当日热度并降序排列，同一天结果稳定。
 * 返回新数组，不修改传入的热点数据。
 */
export function buildHotList({ date = new Date(), topics = HOT_TOPICS } = {}) {
  const seed = daySeed(date)
  return topics
    .map((topic, index) => ({
      title: topic.title,
      cat: topic.cat,
      heat: HEAT_BASE + ((seed + index * 7) % HEAT_RANGE)
    }))
    .sort((a, b) => b.heat - a.heat)
}
