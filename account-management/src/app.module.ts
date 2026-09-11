import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { KeycloakService } from './keycloak/keycloak.service';
import { UsersController } from './users/users.controller';
import { ApplicationsController } from './applications/applications.controller';
import { AuditController } from './audit/audit.controller';
import { AuthorizationController } from './authorization/authorization.controller';
import { BearerTokenGuard } from './auth/bearer.guard';

@Module({ controllers: [AppController, AuthController, UsersController, ApplicationsController, AuditController, AuthorizationController], providers: [AuthService, KeycloakService, BearerTokenGuard] })
export class AppModule {}
