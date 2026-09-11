# TASK — Build Production-Ready Pondok Identity Platform using Keycloak

Build a production-oriented centralized Identity Platform for Pondok Pesantren.

The platform consists of exactly two major components:

1. **Keycloak**

   * Authentication engine
   * OAuth 2.0 Authorization Server
   * OpenID Connect Provider
   * Single Sign-On
   * Credential management
   * User sessions
   * Token issuance
   * JWKS
   * OAuth clients

2. **Pondok Account Management**

   * Custom administrative application
   * Custom user/account management UI
   * Application management
   * Application membership management
   * Role management
   * Permission management
   * Delegated administration
   * Legacy account mapping/migration preparation
   * Audit and operational management

DO NOT implement OAuth2 or OpenID Connect from scratch.

DO NOT build a custom authorization server.

Keycloak MUST be the authentication and OIDC/OAuth2 engine.

---

# 1. PRIMARY OBJECTIVE

The result must be a usable Identity Platform that can later serve many independent applications.

Examples:

* Attendance
* Perpulangan
* Mobile Management
* Finance
* Academic applications
* Future internal systems

Do NOT focus implementation on any specific client application.

Client applications are external consumers of this Identity Platform.

The platform must remain generic.

---

# 2. TARGET ARCHITECTURE

Build:

```text
                       USERS
                         │
                         ▼
              ┌───────────────────────┐
              │       KEYCLOAK        │
              │                       │
              │ Authentication        │
              │ Passwords             │
              │ SSO Sessions          │
              │ OAuth2                │
              │ OpenID Connect        │
              │ Access Tokens         │
              │ ID Tokens             │
              │ Refresh Tokens        │
              │ JWKS                  │
              └──────────┬────────────┘
                         │
                  Admin REST API
                         │
                         ▼
              ┌───────────────────────┐
              │ PONDOK ACCOUNT MGMT   │
              │                       │
              │ Custom Admin UI       │
              │ Users                 │
              │ Applications          │
              │ Membership            │
              │ Roles                 │
              │ Permissions           │
              │ Legacy Mapping        │
              │ Audit                 │
              └──────────┬────────────┘
                         │
                         ▼
                 Platform PostgreSQL

                         │

              Future Client Applications
                         │
                         ▼
                      OIDC
```

Keycloak and Pondok Account Management are separate concerns.

---

# 3. IMPORTANT RESPONSIBILITY BOUNDARY

## Keycloak owns

Keycloak is the source of truth for:

* authentication
* username/password credential
* password verification
* SSO sessions
* OAuth2/OIDC protocol
* authorization code
* PKCE
* access token issuance
* ID token issuance
* refresh tokens
* token revocation
* JWKS
* realm
* OIDC client configuration
* Keycloak user identity

Do NOT duplicate these functions inside Account Management.

---

## Pondok Account Management owns

Account Management is responsible for Pondok-specific business concepts:

* applications
* application memberships
* application-specific roles
* application-specific permissions
* role-permission mapping
* membership-role assignments
* delegated application administrators
* legacy account mappings
* migration metadata
* centralized administration UI
* platform audit metadata

---

# 4. DO NOT DUPLICATE PASSWORD STORAGE

Pondok Account Management MUST NOT store user passwords.

Passwords belong only to Keycloak.

Do not create:

```text
users.password
users.password_hash
credentials
```

inside the Account Management database.

Password operations must be performed through Keycloak-supported mechanisms.

---

# 5. USER IDENTITY MODEL

Keycloak user ID is the central authentication identity.

Account Management should maintain a local representation referencing Keycloak.

Example:

```text
users

id
keycloak_user_id
username
display_name
email nullable
phone nullable
status
created_at
updated_at
```

`keycloak_user_id` must be unique.

Do NOT use username, email, or phone as permanent identity references.

The Account Management application's local `id` may exist for internal database relationships.

---

# 6. KEYCLOAK REALM

Create one primary realm:

```text
pondok
```

Do NOT create one realm per application.

Applications should normally exist as clients inside the same realm.

Example:

```text
Realm:
pondok

Clients:
attendance-web
attendance-api
leave-web
leave-api
mobile-management
account-management
```

The architecture must allow additional clients later without code changes.

---

# 7. KEYCLOAK CLIENT MODEL

Account Management must provide abstraction for managing applications and their associated Keycloak clients.

Conceptually:

```text
Application
   │
   ├── web client
   ├── API/resource client
   ├── mobile client
   └── service client
```

An application can have multiple OAuth clients.

Do NOT assume:

```text
1 application == 1 OAuth client
```

---

# 8. APPLICATION DOMAIN

Create a platform entity:

```text
applications

id
code
name
description
status
created_at
updated_at
```

Example:

```text
code: attendance
name: Attendance
```

Application code must be unique.

Application data belongs to the Account Management database.

---

# 9. KEYCLOAK CLIENT MAPPING

Store relationships between platform applications and Keycloak clients.

Example:

```text
application_oauth_clients

id
application_id
keycloak_client_uuid
client_id
client_type
name
created_at
updated_at
```

Possible types:

```text
web
api
mobile
service
```

Never depend only on human-readable `client_id` when Keycloak provides an internal identifier.

---

# 10. APPLICATION MEMBERSHIP

Having a Keycloak account does NOT automatically grant access to every Pondok application.

Implement:

```text
application_memberships

id
application_id
user_id
status
created_at
updated_at
```

Example:

```text
User Ahmad:

Attendance:
active

Perpulangan:
active

Mobile Management:
no membership
```

Account authentication and application membership are separate concepts.

---

# 11. ROLE MODEL

Roles MUST be application-scoped.

Schema:

```text
roles

id
application_id
code
name
description
created_at
updated_at
```

Example:

```text
Attendance
- admin
- operator
- viewer

Perpulangan
- admin
- musyrif
- wali_kelas
```

These roles:

```text
attendance/admin
perpulangan/admin
```

are NOT the same role.

---

# 12. PERMISSION MODEL

Permissions MUST also be application-scoped.

Schema:

```text
permissions

id
application_id
code
name
description
created_at
updated_at
```

Recommended naming:

```text
<resource>.<action>
```

Example:

```text
attendance.read
attendance.create
attendance.update
attendance.delete
attendance.report.export
```

Permissions are optional.

An application may use roles only.

---

# 13. ROLE PERMISSION MAPPING

Implement:

```text
role_permissions

role_id
permission_id
```

A role and permission must belong to the same application.

Enforce this invariant.

---

# 14. MEMBERSHIP ROLE ASSIGNMENT

Implement:

```text
membership_roles

membership_id
role_id
assigned_by
created_at
```

Role can only belong to the membership's application.

---

# 15. KEYCLOAK ROLE STRATEGY

Application-specific roles should be reflected into Keycloak where appropriate so that client tokens can contain application authorization claims.

Prefer Keycloak client roles rather than one flat global realm-role namespace.

Example:

```text
Keycloak Client:
attendance-api

Client Roles:
admin
operator
viewer
```

And another:

```text
Keycloak Client:
leave-api

Client Roles:
admin
musyrif
wali_kelas
```

The Account Management application remains the primary management interface.

Do not require administrators to manage these manually through the Keycloak Admin Console.

Account Management should synchronize required Keycloak roles through the Admin REST API.

---

# 16. PERMISSION STRATEGY

Permissions are owned by Pondok Account Management.

The implementation should support exposing resolved permissions to client applications through token claims where practical.

Do NOT force every permission to become a Keycloak realm role.

Avoid creating an unmaintainable flat global role namespace.

Design a clean synchronization/token-mapper strategy.

Document the chosen strategy.

---

# 17. ACCOUNT MANAGEMENT APPLICATION

Build a REAL web application.

Do NOT build API-only management.

Minimum pages:

```text
/login
/dashboard

/users
/users/:id

/applications
/applications/:id

/applications/:id/members
/applications/:id/roles
/applications/:id/permissions
/applications/:id/oauth-clients

/audit
```

Exact route naming may vary.

---

# 18. ACCOUNT MANAGEMENT AUTHENTICATION

Account Management itself must authenticate through Keycloak.

Do NOT create a separate login/password system for administrators.

Use OIDC against the `pondok` realm.

Account Management is itself a Keycloak client.

Example:

```text
client_id:
account-management
```

---

# 19. ADMIN AUTHORIZATION

Account Management must support at least:

## Platform Administrator

Can manage:

* all users
* all applications
* all memberships
* all roles
* all permissions
* OAuth clients
* audit records

## Application Administrator

Can manage only assigned applications.

Example:

Attendance administrator can manage:

```text
Attendance members
Attendance roles
Attendance assignments
```

but cannot manage:

```text
Perpulangan
Mobile Management
other applications
```

Do not rely only on frontend hiding.

All administration authorization must be enforced server-side.

---

# 20. USER MANAGEMENT

Provide working UI and backend operations for:

* list users
* search users
* create user
* view user
* update profile
* enable user
* disable user
* initiate password reset / set temporary password
* view application memberships
* assign/remove applications

Operations that affect authentication identity must synchronize with Keycloak.

---

# 21. CREATE USER FLOW

When administrator creates a user:

```text
Account Management UI
        ↓
validate input
        ↓
create Keycloak user
        ↓
create Account Management user reference
        ↓
audit
```

Handle partial failures.

If Keycloak user is created but platform DB write fails, do NOT silently leave inconsistent state.

Implement transactional/compensation strategy.

Document it.

---

# 22. APPLICATION MANAGEMENT

Admin UI must support:

* create application
* update application
* enable/disable application
* view memberships
* manage roles
* manage permissions
* manage OAuth clients

Creating an application should NOT require code changes.

---

# 23. OAUTH CLIENT MANAGEMENT

Through Account Management, administrator must be able to manage Keycloak clients.

Support fields such as:

```text
client ID
client type
name
valid redirect URIs
web origins
enabled/disabled
```

Support common use cases:

```text
web
API
mobile/public
service/confidential
```

Client secrets must never be stored as plaintext unnecessarily in the platform database.

If a secret is displayed after creation/rotation, treat it as sensitive.

Never log client secrets.

---

# 24. KEYCLOAK ADMIN API

Do not manually modify Keycloak database tables.

All runtime Keycloak administration must use:

```text
Keycloak Admin REST API
```

or another officially supported Keycloak administration mechanism.

Create a dedicated service module:

```text
KeycloakAdminService
```

with responsibilities such as:

```text
createUser
updateUser
disableUser
resetPassword

createClient
updateClient
rotateClientSecret

createClientRole
deleteClientRole
assignClientRole
removeClientRole
```

Keep Keycloak integration isolated from application domain logic.

---

# 25. DO NOT EXPOSE ADMIN CREDENTIALS TO THE BROWSER

Keycloak Admin API credentials must only exist server-side.

Browser/frontend MUST NOT directly call privileged Keycloak Admin REST APIs.

Architecture:

```text
Browser
   ↓
Account Management Backend/BFF
   ↓
Keycloak Admin API
```

Never:

```text
Browser
   ↓
Keycloak Admin API using admin secret
```

---

# 26. SERVICE ACCOUNT FOR MANAGEMENT

Use a dedicated confidential Keycloak client/service account for backend administrative integration.

Grant only permissions required by Account Management.

Do NOT use the bootstrap/root administrator credentials during normal application runtime.

Do NOT embed master-realm administrator username/password into application configuration.

Document required service-account permissions.

Follow least privilege.

---

# 27. PLATFORM DATABASE

Use PostgreSQL.

The Account Management application MUST have proper durable persistence.

Minimum tables:

```text
users

applications
application_oauth_clients

application_memberships

roles
permissions
role_permissions
membership_roles

application_admins

legacy_account_links

audit_logs
```

Add necessary timestamps, unique constraints, foreign keys, and indexes.

Use versioned database migrations.

Do NOT rely on ORM auto-sync in production.

---

# 28. KEYCLOAK DATABASE

Keycloak must use a dedicated PostgreSQL database/schema appropriate for production.

Do NOT use the development embedded database.

The Account Management platform database and Keycloak database must be considered separate ownership boundaries.

Account Management MUST NOT directly query or modify Keycloak database internals.

---

# 29. KEYCLOAK PRODUCTION DEPLOYMENT

Use the official Keycloak container image.

Pin an explicit tested Keycloak version.

DO NOT use:

```text
latest
```

in production deployment manifests.

Development may temporarily use flexible versions, but production configuration must pin versions.

Use Keycloak production mode:

```text
kc.sh start
```

or optimized production container workflow.

Do NOT use:

```text
start-dev
```

in production.

---

# 30. OPTIMIZED KEYCLOAK IMAGE

Build an optimized Keycloak image for production.

Enable:

```text
health
metrics
PostgreSQL
```

during the Keycloak build stage where appropriate.

Run using:

```text
start --optimized
```

when compatible with the selected deployment strategy.

---

# 31. KEYCLOAK HOSTNAME

Configure an explicit public hostname.

Example concept:

```text
https://auth.pondok.example
```

Do not rely on dynamically trusting arbitrary Host headers in production.

Use strict hostname configuration appropriate for production.

---

# 32. ADMIN HOSTNAME / NETWORK SEPARATION

Design Keycloak so administrative interfaces can be restricted separately from public authentication endpoints.

Preferred concept:

```text
Public:
auth.pondok.example

Administrative/internal:
auth-admin.internal.example
```

or equivalent reverse-proxy/network restrictions.

Administration surfaces must not be unnecessarily exposed to the public internet.

---

# 33. REVERSE PROXY

Deploy Keycloak behind a production reverse proxy/load balancer.

Examples may include:

* Nginx
* Traefik
* HAProxy

Configure forwarded headers/proxy settings correctly.

Public clients need access to authentication/OIDC endpoints.

Health and metrics management port must not be exposed publicly.

---

# 34. TLS

Production traffic must use HTTPS.

Either:

```text
TLS termination at reverse proxy
```

with correctly secured communication to Keycloak,

or:

```text
TLS directly on Keycloak
```

depending on infrastructure.

Document the selected topology.

Do not ship self-signed development certificates as production configuration.

---

# 35. KEYCLOAK HEALTH AND METRICS

Enable Keycloak health and metrics.

Health endpoints must support deployment probes.

Expected functionality includes:

```text
/health/ready
/health/live
```

Management port should remain internal.

Metrics must be available for monitoring but not publicly exposed.

---

# 36. KEYCLOAK BOOTSTRAP ADMIN

Support secure initial Keycloak bootstrap administration.

Bootstrap credentials are ONLY for initialization.

Normal Account Management runtime must use its dedicated service account.

Do not use hardcoded:

```text
admin / admin
```

Provide `.env.example`, but never commit real bootstrap credentials.

---

# 37. ACCOUNT MANAGEMENT STACK

Choose a maintainable stack suitable for production.

Preferred if repository has no prior constraints:

```text
Next.js
TypeScript
PostgreSQL
```

Account Management can use Next.js as:

```text
UI + server-side BFF
```

or use a separate backend if there is a strong architectural reason.

Do not introduce a separate backend service without documenting why it is needed.

Prefer fewer independently deployed components initially.

---

# 38. ACCOUNT MANAGEMENT PROJECT STRUCTURE

Use modular boundaries.

Example:

```text
src/
├── modules/
│   ├── users/
│   ├── applications/
│   ├── memberships/
│   ├── roles/
│   ├── permissions/
│   ├── oauth-clients/
│   ├── keycloak/
│   ├── audit/
│   └── legacy/
│
├── auth/
├── db/
├── config/
└── shared/
```

Do not put all business logic inside route handlers or React components.

---

# 39. SOURCE OF TRUTH RULES

Maintain explicit source-of-truth boundaries.

## Keycloak

Source of truth for:

```text
authentication identity
credentials
OAuth clients runtime representation
Keycloak sessions
protocol state
client roles synchronized into Keycloak
```

## Platform DB

Source of truth for:

```text
Pondok applications
application membership
permission definitions
role-permission mapping
delegated administration
legacy account mappings
platform audit metadata
```

If a resource is mirrored between systems, explicitly define:

```text
authoritative side
sync direction
failure behavior
reconciliation behavior
```

Do not create uncontrolled bidirectional synchronization.

---

# 40. RECONCILIATION

Because Keycloak and Platform DB are separate systems, inconsistencies can happen.

Provide reconciliation mechanisms.

Examples:

```text
Keycloak user exists but local user missing
local user exists but Keycloak user deleted
platform role exists but Keycloak client role missing
OAuth client mapping references missing Keycloak client
```

Provide administrative visibility or maintenance commands for reconciliation.

Never silently ignore drift.

---

# 41. TRANSACTION BOUNDARIES

Database transaction cannot automatically cover Keycloak Admin REST API calls.

Therefore, operations spanning both systems must explicitly handle failure.

Example:

```text
create Keycloak user
        ↓
create platform user
```

If step 2 fails:

* compensate by deleting/disabling created Keycloak resource where safe, OR
* persist a recoverable synchronization state.

Do not pretend distributed operations are atomic.

---

# 42. AUDIT

Account Management must persist administrative audit events.

Examples:

```text
user.created
user.updated
user.disabled
user.enabled

application.created
application.updated

membership.created
membership.removed

role.created
role.updated
role.assigned
role.removed

permission.created
permission.updated

oauth_client.created
oauth_client.updated
oauth_client.secret_rotated

keycloak.sync.failed
keycloak.sync.recovered
```

Audit record should contain:

```text
actor
action
target
application if relevant
timestamp
request/correlation ID
safe metadata
```

Never store:

```text
password
access token
refresh token
client secret
service-account secret
```

inside audit logs.

---

# 43. LEGACY ACCOUNT SUPPORT

Do NOT implement legacy authentication adapters for individual applications yet.

However, prepare the data model for future migration.

Implement:

```text
legacy_account_links

id
user_id
application_id
legacy_user_id
legacy_username
migration_status
metadata
created_at
migrated_at
```

This phase only needs the platform foundation.

Actual legacy migration adapters will be implemented separately later.

---

# 44. LOGIN UI CUSTOMIZATION

Prepare Keycloak login experience for Pondok branding.

Create a custom Keycloak theme structure.

At minimum prepare:

```text
logo
branding
login page
error page
basic responsive layout
localization support
```

Do not deeply fork Keycloak UI internals unnecessarily.

Keep theme maintenance simple.

---

# 45. LOCALIZATION

Prepare login/account-facing UI for at least:

```text
id
en
```

Structure must allow:

```text
ar
```

later.

Account Management UI must also be localization-ready.

---

# 46. SECURITY

Account Management must implement:

* secure OIDC login
* server-side authorization
* CSRF protections appropriate for chosen architecture
* secure cookies
* HttpOnly cookies where applicable
* SameSite configuration
* input validation
* output encoding
* rate limiting for sensitive management operations where appropriate
* secure secrets handling
* environment validation
* no credential/token logging

Never trust frontend authorization alone.

---

# 47. CONFIGURATION

Provide environment-based configuration.

Example categories:

```text
DATABASE_URL

KEYCLOAK_INTERNAL_URL
KEYCLOAK_PUBLIC_URL
KEYCLOAK_REALM

KEYCLOAK_MANAGEMENT_CLIENT_ID
KEYCLOAK_MANAGEMENT_CLIENT_SECRET

ACCOUNT_MANAGEMENT_CLIENT_ID
ACCOUNT_MANAGEMENT_CLIENT_SECRET

APP_URL
```

Names may be adjusted.

Validate required environment variables at startup.

Provide:

```text
.env.example
```

without real secrets.

---

# 48. DOCKER DEVELOPMENT ENVIRONMENT

Provide a working:

```text
docker-compose.yml
```

or equivalent Compose configuration.

Development environment should include:

```text
Keycloak
Keycloak PostgreSQL
Account Management PostgreSQL
Account Management App
reverse proxy if useful
```

Do NOT use production passwords in repository.

Development configuration must be clearly distinguished from production configuration.

---

# 49. PRODUCTION DEPLOYMENT ARTIFACTS

Provide production-oriented deployment documentation/configuration.

At minimum document:

```text
Keycloak container
PostgreSQL
Account Management container
reverse proxy
TLS
persistent volumes/data
environment/secrets
health checks
backup
upgrade process
```

Do not claim Kubernetes is required.

Deployment must be possible on a normal Linux server with containers.

Kubernetes support may be added later.

---

# 50. DATABASE BACKUP

Document backup strategy for both:

```text
Keycloak PostgreSQL
Account Management PostgreSQL
```

Explain that Keycloak database is critical authentication state.

Include restoration considerations.

---

# 51. KEYCLOAK UPGRADE POLICY

Because Keycloak evolves regularly:

* pin production version
* document current version
* read release notes before upgrades
* test migrations in staging
* back up database
* test custom theme compatibility
* test Account Management Admin API integration

Do not automatically deploy new major/minor Keycloak releases without validation.

---

# 52. CLIENT PLATFORM CONTRACT

Do NOT build individual client integrations.

Only document the generic interface future applications will use.

Account Management should expose application/client configuration necessary to register consumers.

Future clients will use:

```text
OpenID Connect discovery
Authorization Code + PKCE
JWT/JWKS
client credentials where applicable
```

Document:

```text
issuer
discovery URL
authorization model
expected role/permission claims
```

Do not create Attendance/Leave-specific code.

---

# 53. REQUIRED ADMIN USER EXPERIENCE

Administrator should be able to perform this entire workflow using Pondok Account Management:

```text
Login
  ↓
Create User
  ↓
Create Application
  ↓
Create OAuth Client
  ↓
Create Roles
  ↓
Create Permissions
  ↓
Map Permissions to Roles
  ↓
Add User to Application
  ↓
Assign Application Role
```

WITHOUT opening the Keycloak Admin Console during normal operations.

The Keycloak Admin Console remains available for platform administrators/debugging but is not the main business administration interface.

---

# 54. ACCEPTANCE TEST — USER MANAGEMENT

The following must work:

```text
Admin logs into Account Management using Keycloak.

Admin creates Ahmad.

Ahmad appears:
- in Keycloak
- in Account Management DB

Admin disables Ahmad.

Ahmad can no longer authenticate.

Admin enables Ahmad.

Ahmad can authenticate again.
```

---

# 55. ACCEPTANCE TEST — APPLICATION MANAGEMENT

The following must work:

```text
Admin creates application "Attendance".

Admin creates OAuth client "attendance-web".

Account Management creates/configures corresponding Keycloak client.

Admin can configure exact redirect URIs.

Admin can enable/disable the OAuth client.
```

No source-code change should be required.

---

# 56. ACCEPTANCE TEST — AUTHORIZATION

The following must work:

```text
Create application:
attendance

Create roles:
admin
operator
viewer

Create permissions:
attendance.read
attendance.create

Map:
viewer → attendance.read

operator →
attendance.read
attendance.create

Add Ahmad to Attendance.

Assign operator.

Platform stores correct membership/role assignment.

Keycloak receives corresponding client-role representation where required.

Future-issued token can be designed to represent the appropriate application authorization.
```

---

# 57. ACCEPTANCE TEST — DELEGATED ADMIN

Create:

```text
Attendance Admin
```

The account must be able to manage:

```text
Attendance users
Attendance role assignments
```

but must fail server-side when attempting to manage another application's authorization.

---

# 58. NO PLACEHOLDER COMPLETION

The following are NOT acceptable final implementations:

```text
in-memory database
mock Keycloak service
fake Admin REST API
hardcoded users
hardcoded applications
hardcoded roles
TODO connect Keycloak later
TODO persist PostgreSQL later
TODO authorization later
```

Mocks may be used inside isolated automated tests only.

---

# 59. TEST REQUIREMENTS

Implement automated tests for:

* Account Management authentication
* admin authorization
* application administrator isolation
* create/update user
* disable user
* application CRUD
* membership CRUD
* role CRUD
* permission CRUD
* role-permission mapping
* role assignment
* Keycloak Admin API integration layer
* synchronization failure handling
* reconciliation logic
* audit logging

Use test containers or realistic integration environment where practical.

---

# 60. DOCUMENTATION

Create:

```text
docs/
├── architecture.md
├── keycloak-setup.md
├── keycloak-production.md
├── account-management.md
├── database.md
├── authorization.md
├── synchronization.md
├── security.md
├── deployment.md
├── backup-restore.md
└── operations.md
```

Documentation must describe the real implementation.

---

# 61. README

README must provide exact commands for:

```text
local setup
starting PostgreSQL
starting Keycloak
initializing Keycloak
running DB migrations
running Account Management
creating bootstrap administrator
running tests
```

Also clearly document:

```text
development configuration
production requirements
```

---

# 62. IMPLEMENTATION ORDER

Follow this order.

## Phase 1 — Infrastructure

Create:

```text
Docker/Compose
Keycloak
Keycloak PostgreSQL
Platform PostgreSQL
environment configuration
health checks
```

Verify Keycloak actually starts in production-compatible configuration.

---

## Phase 2 — Keycloak Bootstrap

Configure:

```text
realm pondok
Account Management OIDC client
management service account
required service-account privileges
theme foundation
```

Automate configuration where practical.

Avoid manual click-only setup that cannot be reproduced.

---

## Phase 3 — Account Management Foundation

Build:

```text
OIDC login
database
user mapping
admin authorization
Keycloak Admin API module
audit foundation
```

---

## Phase 4 — User Management

Implement complete user administration.

---

## Phase 5 — Application/OAuth Client Management

Implement application and Keycloak client administration.

---

## Phase 6 — Membership and Authorization

Implement:

```text
membership
roles
permissions
role-permission mapping
role assignments
Keycloak synchronization
```

---

## Phase 7 — Delegated Administration

Implement application-scoped administrators.

---

## Phase 8 — Production Hardening

Implement/document:

```text
TLS
reverse proxy
admin endpoint restrictions
metrics
health
backup
security
reconciliation
upgrade procedures
```

---

# 63. FINAL DEFINITION OF DONE

The project is considered complete only when:

* Keycloak runs against PostgreSQL.
* Keycloak is configured using production mode principles.
* Keycloak version is pinned.
* health checks work.
* metrics work.
* public hostname is explicit.
* reverse proxy/TLS setup is documented.
* admin access restrictions are designed.
* Account Management authenticates using Keycloak.
* Account Management never stores passwords.
* Keycloak Admin API is accessed server-side.
* dedicated least-privilege service account is used.
* user management works.
* enable/disable user works.
* application management works.
* OAuth client management works.
* application membership works.
* application-scoped roles work.
* permissions work.
* role-permission mapping works.
* membership role assignment works.
* delegated administration works.
* synchronization failures are handled.
* reconciliation capability exists.
* audit logging works.
* PostgreSQL persistence survives restart.
* automated tests pass.
* production deployment is documented.
* client-specific applications have NOT been implemented.
* no critical path relies on mock or in-memory implementations.

---

# 64. FINAL RULE

Do not rebuild functionality already provided by Keycloak.

Use Keycloak for authentication and standards-based Identity Provider functionality.

Build custom software only for the Pondok-specific account/application/authorization management requirements that Keycloak does not represent conveniently as the primary business management interface.
