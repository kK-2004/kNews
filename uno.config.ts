import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  safelist: [
    'i-tabler-refresh',
    'i-tabler-star',
    'i-tabler-star-filled',
    'i-tabler-brand-github-filled',
    'i-tabler-circle-check-filled',
    'i-tabler-alert-circle-filled',
    'i-tabler-alert-triangle-filled',
    'i-tabler-info-circle-filled',
    'i-tabler-x',
    'i-tabler-sun',
    'i-tabler-moon',
    'i-tabler-device-desktop',
    'i-tabler-copy',
    'i-tabler-home'
  ],
  theme: {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px'
    }
  }
})
