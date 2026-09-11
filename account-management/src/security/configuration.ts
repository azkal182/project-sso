const required = ['DATABASE_URL', 'OIDC_PUBLIC_ISSUER', 'OIDC_INTERNAL_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_REDIRECT_URI', 'FRONTEND_URL', 'SESSION_SECRET', 'KEYCLOAK_ADMIN_ISSUER', 'KEYCLOAK_ADMIN_CLIENT_ID', 'KEYCLOAK_ADMIN_CLIENT_SECRET'] as const;

export function validateConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  if (env.NODE_ENV === 'production') {
    const weak = ['change-me', 'replace-with', 'example', 'secret'].some((marker) => [env.SESSION_SECRET, env.OIDC_CLIENT_SECRET, env.KEYCLOAK_ADMIN_CLIENT_SECRET].some((value) => value?.toLowerCase().includes(marker)));
    if (weak || (env.SESSION_SECRET?.length || 0) < 32) throw new Error('Production secrets must be injected from a secret manager and SESSION_SECRET must be at least 32 characters');
    if (!env.FRONTEND_URL?.startsWith('https://') || !env.OIDC_PUBLIC_ISSUER?.startsWith('https://')) throw new Error('Production FRONTEND_URL and OIDC_PUBLIC_ISSUER must use HTTPS');
  }
}
