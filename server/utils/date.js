import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 传入不带时区的时间字符串，按给定时区解析并转换为 UTC 时间戳（毫秒）
 * @param {string} dateStr - 日期字符串
 * @param {string} [format] - 可选日期格式
 * @param {string} [timeZone] - 原始日期对应时区，默认 'Asia/Shanghai'
 * @returns {number} UTC 时间戳（毫秒）
 */
export function tranformToUTC(dateStr, format, timeZone = 'Asia/Shanghai') {
  if (!format) {
    return dayjs.tz(dateStr, timeZone).valueOf()
  }
  return dayjs.tz(dateStr, format, timeZone).valueOf()
}

/**
 * 解析相对时间字符串为 Date 对象
 * @param {string} dateStr - 日期字符串
 * @param {string} [timeZone] - 时区，默认 'Asia/Shanghai'
 * @returns {Date} Date 对象
 */
export function parseRelativeDate(dateStr, timeZone = 'Asia/Shanghai') {
  if (!dateStr) {
    return new Date()
  }

  // 相对时间格式（如：5分钟前、2小时前、3天前）
  const relativePatterns = [
    { pattern: /^(\d+)\s*秒前$/, unit: 'second', plural: 'seconds' },
    { pattern: /^(\d+)\s*分钟前$/, unit: 'minute', plural: 'minutes' },
    { pattern: /^(\d+)\s*小时前$/, unit: 'hour', plural: 'hours' },
    { pattern: /^(\d+)\s*天前$/, unit: 'day', plural: 'days' },
    { pattern: /^(\d+)\s*周前$/, unit: 'week', plural: 'weeks' },
    { pattern: /^(\d+)\s*月前$/, unit: 'month', plural: 'months' },
    { pattern: /^(\d+)\s*年前$/, unit: 'year', plural: 'years' },
    // 英文相对时间
    { pattern: /^(\d+)\s*seconds?\s*ago$/i, unit: 'second', plural: 'seconds' },
    { pattern: /^(\d+)\s*minutes?\s*ago$/i, unit: 'minute', plural: 'minutes' },
    { pattern: /^(\d+)\s*hours?\s*ago$/i, unit: 'hour', plural: 'hours' },
    { pattern: /^(\d+)\s*days?\s*ago$/i, unit: 'day', plural: 'days' },
    { pattern: /^(\d+)\s*weeks?\s*ago$/i, unit: 'week', plural: 'weeks' },
    { pattern: /^(\d+)\s*months?\s*ago$/i, unit: 'month', plural: 'months' },
    { pattern: /^(\d+)\s*years?\s*ago$/i, unit: 'year', plural: 'years' },
  ]

  for (const { pattern, unit } of relativePatterns) {
    const match = dateStr.match(pattern)
    if (match) {
      const num = parseInt(match[1], 10)
      return dayjs().tz(timeZone).subtract(num, unit).toDate()
    }
  }

  // 尝试直接使用 dayjs 解析标准日期格式
  const parsed = dayjs.tz(dateStr, timeZone)
  if (parsed.isValid()) {
    return parsed.toDate()
  }

  // 解析类似 "5分钟"、"2小时" 的简化格式
  const simplePattern = /^(\d+)\s*(秒|分钟|小时|天|周|月|年)$/
  const simpleMatch = dateStr.match(simplePattern)
  if (simpleMatch) {
    const num = parseInt(simpleMatch[1], 10)
    const unitMap = {
      秒: 'second',
      分钟: 'minute',
      小时: 'hour',
      天: 'day',
      周: 'week',
      月: 'month',
      年: 'year',
    }
    return dayjs().tz(timeZone).subtract(num, unitMap[simpleMatch[2]]).toDate()
  }

  // 无法解析时返回当前时间
  return new Date()
}
