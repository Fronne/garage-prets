export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const TOKEN_KEY = 'garage.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function call(path: string, method: string, body?: unknown): Promise<Response> {
  const token = getToken()
  try {
    return await fetch('/api' + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Pas de connexion internet.')
  }
}

export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await call(path, method, body)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Une erreur est survenue.')
  return data
}

// Les photos demandent le jeton : on les charge en mémoire plutôt que par une simple adresse
export async function photoUrl(id: string): Promise<string> {
  const res = await call('/photos/' + id, 'GET')
  if (!res.ok) throw new ApiError(res.status, 'Photo introuvable.')
  return URL.createObjectURL(await res.blob())
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.')
