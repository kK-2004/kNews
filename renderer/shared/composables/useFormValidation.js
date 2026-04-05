import { computed, reactive } from 'vue'
import { validators } from '@/shared/utils/validation'

/**
 * Form validation helper that tracks per-field error state.
 */
export function useFormValidation(rules, model) {
  const errors = reactive({})

  const validateField = (field) => {
    const fieldRules = rules[field] || []
    const value = model[field]

    for (const rule of fieldRules) {
      const result = typeof rule === 'function' ? rule(value) : true
      if (!result) {
        errors[field] = true
        return false
      }
    }

    delete errors[field]
    return true
  }

  const validateAll = () => Object.keys(rules).every(validateField)

  const helperRules = {
    required: validators.required,
    email: validators.email,
    url: validators.url,
    minLength: (min) => (value) => validators.minLength(value, min)
  }

  return {
    errors,
    validateField,
    validateAll,
    rules: helperRules,
    isValid: computed(() => Object.keys(errors).length === 0)
  }
}
