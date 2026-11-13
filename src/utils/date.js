const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** 时间戳 -> `YYYY-MM-DD HH:mm` */
export function formatTime(ts) {
  const date = new Date(ts)
  const ymd = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 日期 -> `2026 年 11 月 13 日 · 星期五` */
export function formatDateChip(date = new Date()) {
  const value = new Date(date)
  return `${value.getFullYear()} 年 ${value.getMonth() + 1} 月 ${value.getDate()} 日 · 星期${
    WEEKDAYS[value.getDay()]
  }`
}
