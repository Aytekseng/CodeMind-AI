import axios from "axios"
export function normalizeError(error: unknown): { message: string; response?: { data?: { message?: string } } } {
  if (axios.isAxiosError<{ message?: string }>(error)) return error
  return { message: error instanceof Error ? error.message : "İşlem tamamlanamadı." }
}
