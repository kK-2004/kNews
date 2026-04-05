export function formatDate(value, locale = 'en-US') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export function truncate(value, max = 120) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}
