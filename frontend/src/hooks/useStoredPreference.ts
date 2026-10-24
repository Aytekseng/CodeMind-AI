"use client"
import { useCallback, useSyncExternalStore } from "react"
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener("codemind-preference", callback)
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("codemind-preference", callback) }
}
export function useStoredPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribe, () => localStorage.getItem(key) ?? fallback, () => fallback)
  const setValue = useCallback((value: string) => {
    localStorage.setItem(key, value)
    window.dispatchEvent(new Event("codemind-preference"))
  }, [key])
  return [value, setValue] as const
}
