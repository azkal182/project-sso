import { Injectable } from '@nestjs/common';

@Injectable()
export class KeycloakService {
  private token = ''; private expiresAt = 0;
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = Number(process.env.KEYCLOAK_REQUEST_TIMEOUT_MS || 5000)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timeout); }
  }
  private async accessToken() {
    if (this.token && Date.now() < this.expiresAt) return this.token;
    const response = await this.fetchWithTimeout(`${process.env.KEYCLOAK_ADMIN_ISSUER}/protocol/openid-connect/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID!, client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET! }) });
    if (!response.ok) throw new Error(`Keycloak service token failed: ${response.status}`);
    const body = await response.json(); this.token = body.access_token; this.expiresAt = Date.now() + Math.max(30, body.expires_in - 30) * 1000; return this.token;
  }
  async request(method: string, route: string, body?: unknown) {
    const base = process.env.KEYCLOAK_ADMIN_ISSUER!.replace('/realms/pondok', '');
    const retryable = ['GET', 'PUT', 'DELETE'].includes(method);
    let lastStatus = 0;
    for (let attempt = 0; attempt < (retryable ? 3 : 1); attempt++) {
      try {
        const response = await this.fetchWithTimeout(`${base}/admin/realms/pondok${route}`, { method, headers: { authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
        lastStatus = response.status;
        if (response.ok) return response.status === 201 || response.status === 204 ? null : response.json();
        if (response.status < 500 || !retryable) break;
      } catch (error) {
        if (!retryable || attempt === 2) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
    throw new Error(`Keycloak Admin API failed: ${lastStatus || 'timeout'}`);
  }
  async createUser(body: unknown) {
    const response = await this.fetchWithTimeout(`${process.env.KEYCLOAK_ADMIN_ISSUER!.replace('/realms/pondok', '')}/admin/realms/pondok/users`, { method: 'POST', headers: { authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Keycloak Admin API failed: ${response.status}`);
    const location = response.headers.get('location');
    const id = location?.split('/').pop();
    if (!id) throw new Error('Keycloak user creation did not return a user id');
    return id;
  }
  async user(id: string) { return this.request('GET', `/users/${encodeURIComponent(id)}`); }
  async updateUser(id: string, body: unknown) { return this.request('PUT', `/users/${encodeURIComponent(id)}`, body); }
  async deleteUser(id: string) { return this.request('DELETE', `/users/${encodeURIComponent(id)}`); }
  async resetPassword(id: string, password: string, temporary = true) { return this.request('PUT', `/users/${encodeURIComponent(id)}/reset-password`, { type: 'password', value: password, temporary }); }
  async clientRoles(clientUuid: string) { return this.request('GET', `/clients/${clientUuid}/roles`); }
  async createClient(body: unknown) { return this.request('POST', '/clients', body); }
  async findClient(clientId: string) { const rows: any[] = await this.request('GET', `/clients?clientId=${encodeURIComponent(clientId)}`); return rows[0]; }
  async client(id: string) { return this.request('GET', `/clients/${encodeURIComponent(id)}`); }
  async updateClient(id: string, body: unknown) { return this.request('PUT', `/clients/${encodeURIComponent(id)}`, body); }
  async deleteClient(id: string) { return this.request('DELETE', `/clients/${encodeURIComponent(id)}`); }
  async rotateClientSecret(id: string) { return this.request('POST', `/clients/${encodeURIComponent(id)}/client-secret`); }
  async ensureClientRole(clientUuid: string, roleName: string) { const existing: any[] = await this.clientRoles(clientUuid); if (!existing.some((role) => role.name === roleName)) await this.request('POST', `/clients/${clientUuid}/roles`, { name: roleName, description: `Managed by Pondok Account Management` }); }
  async clientRole(clientUuid: string, roleName: string) { return this.request('GET', `/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`); }
  async assignClientRole(userUuid: string, clientUuid: string, roleName: string) { const role = await this.clientRole(clientUuid, roleName); await this.request('POST', `/users/${encodeURIComponent(userUuid)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`, [role]); }
  async removeClientRole(userUuid: string, clientUuid: string, roleName: string) { const role = await this.clientRole(clientUuid, roleName); await this.request('DELETE', `/users/${encodeURIComponent(userUuid)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`, [role]); }
  async deleteClientRole(clientUuid: string, roleName: string) { await this.request('DELETE', `/clients/${clientUuid}/roles/${encodeURIComponent(roleName)}`); }
}
