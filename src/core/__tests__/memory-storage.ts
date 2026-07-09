/** Minimal in-memory Storage implementation for kernel tests. */
export function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
    removeItem(key: string) {
      data.delete(key)
    },
    clear() {
      data.clear()
    },
  }
}
