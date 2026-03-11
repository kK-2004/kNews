export const validators = {
  required: (value) => value !== undefined && value !== null && value !== '',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')),
  url: (value) => {
    try {
      new URL(String(value || ''))
      return true
    } catch {
      return false
    }
  },
  minLength: (value, min) => String(value || '').length >= min
}

export function validate(schema, payload) {
  const errors = {}

  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const valid = typeof rule === 'function' ? rule(payload[field]) : true
      if (!valid) {
        errors[field] = true
        break
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
