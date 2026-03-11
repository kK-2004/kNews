export const env = {
  appName: import.meta.env.VITE_APP_NAME || 'kNews',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  analyticsEnabled: String(import.meta.env.VITE_ENABLE_ANALYTICS || 'false') === 'true'
}
