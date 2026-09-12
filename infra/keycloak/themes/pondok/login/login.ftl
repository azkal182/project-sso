<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=false; section>
  <#if section = "header">
    ${msg("loginAccountTitle")}
  <#elseif section = "form">
    <div class="pondok-shell">
      <section class="pondok-brand-panel" aria-label="Pondok Pesantren Darul Falah Amtsilati">
        <div class="pondok-brand-content">
          <p class="pondok-eyebrow">Pondok Identity Platform</p>
          <h1 class="pondok-brand-title">Pondok Pesantren<br>Darul Falah Amtsilati</h1>
          <p class="pondok-brand-description">Satu pintu akses yang aman untuk mendukung layanan digital pondok dan seluruh keluarga besar Darul Falah Amtsilati.</p>
        </div>
      </section>

      <main class="pondok-form-panel">
        <div class="pondok-form-card">
          <img class="pondok-logo" src="${url.resourcesPath}/img/logo.svg" alt="Logo Darul Falah Amtsilati">
          <h2 class="pondok-form-title">${msg("loginAccountTitle")}</h2>
          <p class="pondok-form-subtitle">Gunakan akun pondok Anda untuk melanjutkan.</p>

          <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="alert-${message.type}">${kcSanitize(message.summary)?no_esc}</div>
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
                <label class="pondok-checkbox"><#if login.rememberMe??><input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked><#else><input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"></#if>${msg("rememberMe")}</label>
              </#if>
              <#if realm.resetPasswordAllowed>
                <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
              </#if>
            </div>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
            <button tabindex="4" class="pondok-submit" name="login" id="kc-login" type="submit">${msg("doLogIn")}</button>
          </form>

          <p class="pondok-footer">Akses ini dilindungi oleh Pondok Identity Platform.<br>Jika mengalami kendala, hubungi administrator pondok.</p>
        </div>
      </main>
    </div>
  </#if>
</@layout.registrationLayout>
