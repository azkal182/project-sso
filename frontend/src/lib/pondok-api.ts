export type PondokUser = {
  id: string
  username: string
  displayName?: string | null
  email?: string | null
  realmRoles: string[]
  clientRoles: string[]
}

export type Application = {
  id: string
  code: string
  name: string
  description?: string | null
  status: string
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function pondokApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase()
  let csrfToken: string | undefined
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfResponse = await fetch(`${apiBase}/auth/csrf`, { credentials: 'include' })
    if (!csrfResponse.ok) throw new Error('Unable to initialize CSRF protection')
    csrfToken = (await csrfResponse.json()).token
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}), ...(init?.headers || {}) },
  })
  if (response.status === 401) {
    window.location.href = `${apiBase}/auth/login?fresh=1`
    throw new Error('Unauthenticated')
  }
  if (!response.ok) throw new Error(await response.text())
  return response.status === 204 ? (null as T) : response.json()
}

export async function currentUser() {
  return pondokApi<{ user: PondokUser | null }>('/api/me')
}

export function keycloakLogin() {
  window.location.href = `${apiBase}/auth/login?fresh=1`
}

export function keycloakLogout() {
  window.location.href = `${apiBase}/auth/logout`
}
