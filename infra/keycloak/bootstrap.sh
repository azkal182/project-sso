#!/usr/bin/env bash
set -euo pipefail

KC_URL="http://keycloak:8080"
REALM="pondok"
ACCOUNT_CLIENT="account-management"
SERVICE_CLIENT="account-management-service"
ACCOUNT_REDIRECT_URI="${ACCOUNT_MANAGEMENT_REDIRECT_URI:-http://localhost:5173/auth/callback}"
ACCOUNT_WEB_ORIGIN="${ACCOUNT_MANAGEMENT_WEB_ORIGIN:-http://localhost:5173}"
ACCOUNT_POST_LOGOUT_URI="${ACCOUNT_MANAGEMENT_POST_LOGOUT_URI:-${ACCOUNT_WEB_ORIGIN}/sign-in}"

echo "Waiting for Keycloak administration endpoint..."
until bash -c 'exec 3<>/dev/tcp/keycloak/9000; printf "GET /health/ready HTTP/1.0\r\n\r\n" >&3; grep -q "200 OK" <&3'; do sleep 2; done

/opt/keycloak/bin/kcadm.sh config credentials \
  --server "${KC_URL}" \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}"

if ! /opt/keycloak/bin/kcadm.sh get realms/"${REALM}" >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh create realms -f /opt/bootstrap/realm.json
fi
/opt/keycloak/bin/kcadm.sh update realms/"${REALM}" \
  -s sslRequired="${KEYCLOAK_REALM_SSL_REQUIRED:-NONE}" \
  -s loginTheme=pondok
if ! /opt/keycloak/bin/kcadm.sh get roles/platform-admin -r "${REALM}" >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh create roles -r "${REALM}" -s name=platform-admin -s description="Pondok platform administrator"
fi

ensure_client() {
  local client_id="$1"
  shift
  local internal_id
  internal_id="$(/opt/keycloak/bin/kcadm.sh get clients -r "${REALM}" -q clientId="${client_id}" --fields id --format csv --noquotes | head -n 1 || true)"
  if [[ -z "${internal_id}" ]]; then
    /opt/keycloak/bin/kcadm.sh create clients -r "${REALM}" -s clientId="${client_id}" "$@"
  else
    /opt/keycloak/bin/kcadm.sh update "clients/${internal_id}" -r "${REALM}" "$@"
  fi
}

ensure_client "${ACCOUNT_CLIENT}" \
  -s name="Pondok Account Management" \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=false \
  -s clientAuthenticatorType=client-secret \
  -s secret="${ACCOUNT_MANAGEMENT_CLIENT_SECRET}" \
  -s standardFlowEnabled=true \
  -s directAccessGrantsEnabled=false \
  -s serviceAccountsEnabled=false \
  -s "attributes.\"post.logout.redirect.uris\"=${ACCOUNT_POST_LOGOUT_URI}" \
  -s "redirectUris=[\"${ACCOUNT_REDIRECT_URI}\"]" \
  -s "webOrigins=[\"${ACCOUNT_WEB_ORIGIN}\"]"

account_internal_id="$(/opt/keycloak/bin/kcadm.sh get clients -r "${REALM}" -q clientId="${ACCOUNT_CLIENT}" --fields id --format csv --noquotes | head -n 1)"
if ! /opt/keycloak/bin/kcadm.sh get "clients/${account_internal_id}/protocol-mappers/models" -r "${REALM}" -q name=pondok-realm-roles | grep -q 'pondok-realm-roles'; then
  /opt/keycloak/bin/kcadm.sh create "clients/${account_internal_id}/protocol-mappers/models" -r "${REALM}" \
    -s name=pondok-realm-roles \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-usermodel-realm-role-mapper \
    -s 'config."claim.name"=realm_access.roles' \
    -s 'config."id.token.claim"=true' \
    -s 'config."access.token.claim"=true' \
    -s 'config."jsonType.label"=String' \
    -s 'config."multivalued"=true'
fi

ensure_client "${SERVICE_CLIENT}" \
  -s name="Pondok Account Management Runtime Service" \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=false \
  -s clientAuthenticatorType=client-secret \
  -s secret="${MANAGEMENT_CLIENT_SECRET}" \
  -s standardFlowEnabled=false \
  -s directAccessGrantsEnabled=false \
  -s serviceAccountsEnabled=true

service_user="service-account-${SERVICE_CLIENT}"
for role in manage-users view-users query-users manage-clients view-clients query-clients; do
  /opt/keycloak/bin/kcadm.sh add-roles -r "${REALM}" \
    --uusername "${service_user}" \
    --cclientid realm-management \
    --rolename "${role}"
done

if [[ "${SEED_ENABLED:-false}" == "true" ]]; then
  : "${SEED_USERNAME:?SEED_USERNAME is required when SEED_ENABLED=true}"
  : "${SEED_PASSWORD:?SEED_PASSWORD is required when SEED_ENABLED=true}"
  seed_user_id="$(/opt/keycloak/bin/kcadm.sh get users -r "${REALM}" -q username="${SEED_USERNAME}" --fields id --format csv --noquotes | head -n 1 || true)"
  if [[ -z "${seed_user_id}" ]]; then
    /opt/keycloak/bin/kcadm.sh create users -r "${REALM}" \
      -s username="${SEED_USERNAME}" \
      -s enabled=true \
      -s email="${SEED_USERNAME}@example.test" \
      -s emailVerified=true \
      -s firstName=Seed \
      -s lastName="Browser User"
    seed_user_id="$(/opt/keycloak/bin/kcadm.sh get users -r "${REALM}" -q username="${SEED_USERNAME}" --fields id --format csv --noquotes | head -n 1)"
  fi
  /opt/keycloak/bin/kcadm.sh set-password -r "${REALM}" --userid "${seed_user_id}" --new-password "${SEED_PASSWORD}"
  /opt/keycloak/bin/kcadm.sh add-roles -r "${REALM}" --uusername "${SEED_USERNAME}" --rolename platform-admin
  echo "Seed user '${SEED_USERNAME}' is ready for browser testing."
fi

echo "Keycloak realm '${REALM}' and clients are ready."
echo "Runtime management uses '${SERVICE_CLIENT}' service-account roles; bootstrap admin is not used by applications."
