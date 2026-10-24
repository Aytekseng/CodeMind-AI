// Keys live only in this page's JS process. Never persist provider secrets to web storage.
const keys = new Map<string, string>()
export const getApiKey = (provider: string) => keys.get(provider) || ""
export const setApiKey = (provider: string, value: string) => { keys.set(provider, value) }
export function clearApiKeys() {
  keys.clear()
  if (typeof window !== "undefined") {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("codemind_") && key.endsWith("_api_key")) localStorage.removeItem(key)
    }
    sessionStorage.removeItem("codemind_terminal_session_v1")
  }
}
