import { chromium } from 'playwright'
import crypto from 'node:crypto'

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173'
const username = process.env.E2E_USERNAME
const password = process.env.E2E_PASSWORD

if (!username || !password) {
  throw new Error('E2E_USERNAME and E2E_PASSWORD are required; credentials are never stored in the repository.')
}

const browser = await chromium.launch({ headless: process.env.E2E_HEADED !== '1' })
const page = await browser.newPage()
let applicationId: string | undefined

async function expectText(text: string) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible' })
}

try {
  await page.goto(`${baseUrl}/auth/login?fresh=1`, { waitUntil: 'networkidle' })
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"], input[type="submit"]').first().click()

  const profileFirstName = page.locator('#firstName, input[name="firstName"]').first()
  if (await profileFirstName.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profileFirstName.fill(process.env.E2E_FIRST_NAME || 'Pilot')
    await page.locator('#lastName, input[name="lastName"]').first().fill(process.env.E2E_LAST_NAME || 'Admin')
    await page.locator('button[type="submit"], input[type="submit"]').first().click()
  }

  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expectText('Account Management')

  const code = `pilot-${Date.now()}`
  const name = `Pilot Application ${code}`
  await page.goto(`${baseUrl}/applications`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Create application' }).click()
  await page.locator('#app-code').fill(code)
  await page.locator('#app-name').fill(name)
  await page.locator('#app-description').fill('Authenticated P0 pilot test application')
  await page.getByRole('button', { name: 'Create application', exact: true }).last().click()
  await expectText(name)

  const applicationCard = page.getByText(name, { exact: true }).locator('xpath=ancestor::div[.//a[contains(normalize-space(.), "Manage")]][1]')
  await applicationCard.getByRole('link', { name: 'Manage' }).click()
  await page.waitForURL(/\/applications\//)

  await page.getByRole('button', { name: 'Manage admins' }).click()
  await page.locator('#admin-user option').nth(1).waitFor({ state: 'attached', timeout: 5000 })
  const pilotAdminValue = await page.locator('#admin-user option').evaluateAll((options, expectedUsername) => options.find((option) => option.getAttribute('value') && (option.textContent || '').toLowerCase().includes(String(expectedUsername).toLowerCase()))?.getAttribute('value') || '', username)
  if (!pilotAdminValue) throw new Error('Pilot user was not available in the admin selector')
  await page.locator('#admin-user').selectOption(pilotAdminValue)
  await page.getByRole('button', { name: 'Assign admin' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  await expectText('Application administrators')

  await page.getByRole('tab', { name: 'Roles' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  await page.locator('#role-code').fill('pilot.viewer')
  await page.locator('#name').first().fill('Pilot Viewer')
  await page.locator('#description').fill('Read-only pilot role')
  await page.getByRole('button', { name: 'Create role' }).click()
  await expectText('Pilot Viewer')

  await page.getByRole('tab', { name: 'Permissions' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  await page.locator('#permission-code').fill('pilot.read')
  await page.locator('#name').first().fill('Pilot Read')
  await page.locator('#description').fill('Read pilot data')
  await page.getByRole('button', { name: 'Create permission' }).click()
  await expectText('Pilot Read')

  await page.getByRole('tab', { name: 'Roles' }).click()
  await page.getByRole('button', { name: 'Add permission' }).click()
  await page.locator('select').last().selectOption({ label: 'Pilot Read (pilot.read)' })
  await page.getByRole('button', { name: 'Save assignment' }).click()

  await page.getByRole('tab', { name: 'Members' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  await page.locator('#member-user option').nth(1).waitFor({ state: 'attached', timeout: 5000 })
  const pilotUserValue = await page.locator('#member-user option').evaluateAll((options, expectedUsername) => options.find((option) => option.getAttribute('value') && (option.textContent || '').toLowerCase().includes(String(expectedUsername).toLowerCase()))?.getAttribute('value') || '', username)
  if (!pilotUserValue) throw new Error(`Pilot user was not available in the member selector: ${(await page.locator('#member-user option').allTextContents()).join(', ')}`)
  await page.locator('#member-user').selectOption(pilotUserValue)
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.waitForTimeout(500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Members' }).click()
  await expectText('pilot-admin')
  await page.getByRole('button', { name: 'Assign role' }).click()
  await page.locator('select').last().selectOption({ label: 'Pilot Viewer (pilot.viewer)' })
  await page.getByRole('button', { name: 'Save assignment' }).click()

  await page.getByRole('tab', { name: 'OAuth clients' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).first().click()
  await page.locator('#client-id').fill(`${code}-web`)
  await page.locator('#name').first().fill('Pilot Web Client')
  await page.locator('#client-type').selectOption('mobile')
  await page.locator('#redirect-uris').fill('http://localhost:5173/oidc-test')
  await page.locator('#web-origins').fill('http://localhost:5173')
  await page.getByRole('button', { name: 'Create client' }).click()
  await expectText('Pilot Web Client')

  applicationId = new URL(page.url()).pathname.split('/').pop()
  if (applicationId) {
    const verifier = crypto.randomBytes(48).toString('base64url')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
    const state = crypto.randomBytes(16).toString('hex')
    const authorizationUrl = new URL('http://localhost:8080/realms/pondok/protocol/openid-connect/auth')
    authorizationUrl.search = new URLSearchParams({ client_id: `${code}-web`, redirect_uri: 'http://localhost:5173/oidc-test', response_type: 'code', scope: 'openid profile email roles', state, code_challenge: challenge, code_challenge_method: 'S256' }).toString()
    await page.goto(authorizationUrl.toString(), { waitUntil: 'networkidle' })
    await page.waitForURL(/\/oidc-test\?/, { timeout: 15000 })
    const authorizationCode = new URL(page.url()).searchParams.get('code')
    if (!authorizationCode) throw new Error('Client authorization code was not returned')
    const tokenResponse = await fetch('http://localhost:8080/realms/pondok/protocol/openid-connect/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: `${code}-web`, redirect_uri: 'http://localhost:5173/oidc-test', code: authorizationCode, code_verifier: verifier }) })
    if (!tokenResponse.ok) throw new Error(`Client token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`)
    const accessToken = (await tokenResponse.json()).access_token
    const authorizationResponse = await fetch(`http://localhost:3000/api/applications/${applicationId}/authorization`, { headers: { authorization: `Bearer ${accessToken}` } })
    if (!authorizationResponse.ok) throw new Error(`Authorization contract failed: ${authorizationResponse.status} ${await authorizationResponse.text()}`)
    const authorization = await authorizationResponse.json()
    if (!authorization.roles.includes('pilot.viewer') || !authorization.permissions.includes('pilot.read')) throw new Error(`Unexpected authorization response: ${JSON.stringify(authorization)}`)
    await page.goto(`${baseUrl}/applications/${applicationId}`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Disable' }).click()
    await expectText('disabled')
    const revokedResponse = await fetch(`http://localhost:3000/api/applications/${applicationId}/authorization`, { headers: { authorization: `Bearer ${accessToken}` } })
    if (revokedResponse.status !== 403) throw new Error(`Revoked membership should return 403, received ${revokedResponse.status}`)
    await page.getByRole('button', { name: 'Enable' }).click()
    const csrf = await page.evaluate(async () => (await fetch('/auth/csrf', { credentials: 'include' })).json())
    await page.evaluate(async ({ id, token }) => { await fetch(`/api/applications/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'x-csrf-token': token } }) }, { id: applicationId, token: csrf.token })
  }
  await page.goto(`${baseUrl}/auth/logout`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/sign-in/, { timeout: 15000 })
  process.stdout.write('Authenticated pilot E2E passed\n')
} finally {
  await browser.close()
}
