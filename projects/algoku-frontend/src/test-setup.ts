// Node 22+ ships an experimental Web Storage implementation that can shadow
// jsdom's `window.localStorage` with a stub whose methods are undefined
// (triggered by an internal `--localstorage-file` flag with no path). When
// detected, replace it with a Map-backed shim so tests can persist values.

function installLocalStorageShim() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
  }
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true })
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true })
}

if (typeof window !== "undefined" && typeof window.localStorage?.setItem !== "function") {
  installLocalStorageShim()
}
