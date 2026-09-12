<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=false; section>
  <#if section = "header">
    ${msg("loginAccountTitle")}
  <#elseif section = "form">
    <div class="pondok-shell">
      <aside class="pondok-brand-panel" aria-label="Pondok Pesantren Darul Falah Amtsilati">
        <div class="pondok-wordmark">
          <span>Darul Falah</span>
          <span class="pondok-wordmark-divider" aria-hidden="true"></span>
          <span>Amtsilati</span>
        </div>

        <div class="pondok-brand-content">
          <p class="pondok-eyebrow">Pondok Identity Platform</p>
          <h1 class="pondok-brand-title">Akses layanan pondok dalam satu akun.</h1>
          <p class="pondok-brand-description">Layanan identitas resmi Pondok Pesantren Darul Falah Amtsilati untuk akses yang konsisten dan aman ke seluruh aplikasi pondok.</p>
        </div>

        <p class="pondok-brand-footer">Pondok Pesantren Darul Falah Amtsilati</p>
      </aside>

      <main class="pondok-form-panel">
        <div class="pondok-form-card">
          <div class="pondok-mobile-brand">
            <span class="pondok-mobile-brand-name">Pondok Pesantren Darul Falah Amtsilati</span>
            <span class="pondok-mobile-brand-location">Pondok Identity Platform</span>
          </div>

          <p class="pondok-platform-label">Pondok Identity Platform</p>
          <h2 class="pondok-form-title">${msg("loginAccountTitle")}</h2>
          <p class="pondok-form-subtitle">Masukkan akun pondok Anda untuk melanjutkan ke layanan yang dituju.</p>

          <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="alert-${message.type}" role="alert">${kcSanitize(message.summary)?no_esc}</div>
          </#if>

          <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="pondok-field">
              <label for="username">${msg("usernameOrEmail")}</label>
              <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="username" aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>">
            </div>

            <div class="pondok-field">
              <label for="password">${msg("password")}</label>
              <input tabindex="2" id="password" name="password" type="password" autocomplete="current-password" aria-invalid="<#if messagesPerField.existsError('username','password')>true<#else>false</#if>">
            </div>

            <div class="pondok-form-options">
              <#if realm.rememberMe && !usernameEditDisabled??>
                <label class="pondok-checkbox">
                  <#if login.rememberMe??>
                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked>
                  <#else>
                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox">
                  </#if>
                  <span>${msg("rememberMe")}</span>
                </label>
              </#if>
              <#if realm.resetPasswordAllowed>
                <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
              </#if>
            </div>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
            <button tabindex="4" class="pondok-submit" name="login" id="kc-login" type="submit">${msg("doLogIn")}</button>
          </form>

          <p class="pondok-footer">Akses terbatas untuk pengguna yang berwenang. Hubungi administrator pondok jika Anda mengalami kendala akun.</p>
        </div>
      </main>
    </div>
  </#if>
</@layout.registrationLayout>
