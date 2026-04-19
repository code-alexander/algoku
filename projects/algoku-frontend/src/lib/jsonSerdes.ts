// Pure JSON replacer/reviver used by the TanStack Query persister so cached
// entries containing BigInt / Uint8Array round-trip through localStorage.
// Default JSON.stringify throws on BigInt and silently drops typed arrays.

type Tagged = { __t: "bigint"; v: string } | { __t: "u8a"; v: string }

function bytesToBase64(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return { __t: "bigint", v: value.toString() } satisfies Tagged
  if (value instanceof Uint8Array) return { __t: "u8a", v: bytesToBase64(value) } satisfies Tagged
  return value
}

export function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__t" in value && "v" in value) {
    const tagged = value as Tagged
    if (tagged.__t === "bigint") return BigInt(tagged.v)
    if (tagged.__t === "u8a") return base64ToBytes(tagged.v)
  }
  return value
}

export function serialize<T>(value: T): string {
  return JSON.stringify(value, replacer)
}

export function deserialize<T>(s: string): T {
  return JSON.parse(s, reviver) as T
}
