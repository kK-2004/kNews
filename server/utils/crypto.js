function toHex(buffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function leftRotate(x, c) {
  return (x << c) | (x >>> (32 - c))
}

function md5Bytes(input) {
  const msg = new TextEncoder().encode(String(input || ''))
  const bitLen = msg.length * 8

  const withOne = msg.length + 1
  const padLen = (56 - (withOne % 64) + 64) % 64
  const totalLen = withOne + padLen + 8
  const data = new Uint8Array(totalLen)
  data.set(msg)
  data[msg.length] = 0x80

  const view = new DataView(data.buffer)
  view.setUint32(totalLen - 8, bitLen >>> 0, true)
  view.setUint32(totalLen - 4, Math.floor(bitLen / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ]
  const k = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0)

  for (let offset = 0; offset < data.length; offset += 64) {
    const m = new Uint32Array(16)
    for (let i = 0; i < 16; i += 1) {
      m[i] = view.getUint32(offset + i * 4, true)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i += 1) {
      let f
      let g
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }

      const nextD = d
      d = c
      c = b
      const sum = (a + f + k[i] + m[g]) >>> 0
      b = (b + leftRotate(sum, s[i])) >>> 0
      a = nextD
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  const out = new ArrayBuffer(16)
  const outView = new DataView(out)
  outView.setUint32(0, a0, true)
  outView.setUint32(4, b0, true)
  outView.setUint32(8, c0, true)
  outView.setUint32(12, d0, true)
  return out
}

export async function myCrypto(input, algorithm = 'SHA-256') {
  const normalized = String(algorithm || 'SHA-256').toUpperCase()

  if (normalized === 'MD5') {
    return toHex(md5Bytes(input))
  }

  const subtleName = normalized === 'SHA-1'
    ? 'SHA-1'
    : normalized === 'SHA-256'
      ? 'SHA-256'
      : normalized === 'SHA-384'
        ? 'SHA-384'
        : normalized === 'SHA-512'
          ? 'SHA-512'
          : 'SHA-256'

  const encoded = new TextEncoder().encode(String(input || ''))
  const digest = await crypto.subtle.digest(subtleName, encoded)
  return toHex(digest)
}

export async function md5(input) {
  return myCrypto(input, 'MD5')
}
