import { Buffer } from 'node:buffer'

export function encodeBase64(input) {
  return Buffer.from(String(input || '')).toString('base64')
}

export function decodeBase64(input) {
  return Buffer.from(String(input || ''), 'base64').toString('utf8')
}

