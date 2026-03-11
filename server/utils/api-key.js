import { myCrypto } from './crypto'

const API_KEY_PREFIX = 'knews_'
const API_KEY_RANDOM_LENGTH = 32
const HASH_SALT = 'knews_api_key_salt'

function randomString(length = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export function generateApiKey() {
  return `${API_KEY_PREFIX}${randomString(API_KEY_RANDOM_LENGTH)}`
}

export async function hashApiKey(apiKey) {
  return myCrypto(String(apiKey || '') + HASH_SALT, 'SHA-256')
}

export async function verifyApiKey(apiKey, keyHash) {
  const computed = await hashApiKey(apiKey)
  return String(computed) === String(keyHash || '')
}

export function isValidApiKeyFormat(apiKey) {
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length === API_KEY_PREFIX.length + API_KEY_RANDOM_LENGTH
}
