import { Controller, Get, Post, Req, Res, HttpCode } from '@nestjs/common';
import crypto from 'node:crypto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('login') async login(@Req() req: any, @Res() res: any) { res.redirect(await this.auth.login(req.session, req.query.fresh === '1')); }
  @Get('csrf') csrf(@Req() req: any) { return { token: req.session.csrfToken }; }
  @Get('callback') async callback(@Req() req: any, @Res() res: any) { if (req.query.error) return res.status(401).send('OIDC authentication failed'); if (!req.query.code || req.query.state !== req.session.oidc?.state) return res.status(400).send('Invalid OIDC state'); const authenticated = await this.auth.callback(req.query.code, req.session); await new Promise<void>((resolve, reject) => req.session.regenerate((error: Error | null) => error ? reject(error) : resolve())); req.session.user = authenticated.user; req.session.idToken = authenticated.idToken; req.session.csrfToken = crypto.randomBytes(32).toString('base64url'); const frontendUrl = process.env.FRONTEND_URL; res.redirect(frontendUrl ? `${frontendUrl}/dashboard` : '/dashboard'); }
  @Get('logout') logout(@Req() req: any, @Res() res: any) {
    const redirectUri = `${process.env.FRONTEND_URL || process.env.OIDC_REDIRECT_URI!.replace('/auth/callback', '')}/sign-in`;
    const params = new URLSearchParams({ client_id: process.env.OIDC_CLIENT_ID!, post_logout_redirect_uri: redirectUri });
    if (req.session.idToken) params.set('id_token_hint', req.session.idToken);
    const logoutUrl = `${process.env.OIDC_PUBLIC_ISSUER}/protocol/openid-connect/logout?${params.toString()}`;
    req.session.destroy(() => res.redirect(logoutUrl));
  }
  @Post('logout') @HttpCode(204) logoutPost(@Req() req: any) { return new Promise<void>((resolve) => req.session.destroy(() => resolve())); }
}
