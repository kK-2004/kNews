import { myFetch } from './utils/fetch'
import { defineSource, defineRSSHubSource, defineRSSSource, proxySource } from './utils/source'
import { md5, myCrypto } from './utils/crypto'
import { encodeBase64 } from './utils/base64'
import { parseRelativeDate, tranformToUTC } from './utils/date'

globalThis.myFetch = myFetch
globalThis.defineSource = defineSource
globalThis.defineRSSSource = defineRSSSource
globalThis.defineRSSHubSource = defineRSSHubSource
globalThis.proxySource = proxySource
globalThis.md5 = md5
globalThis.myCrypto = myCrypto
globalThis.encodeBase64 = encodeBase64
globalThis.parseRelativeDate = parseRelativeDate
globalThis.tranformToUTC = tranformToUTC
