import { NgModule } from '@angular/core';
import { AuthModule } from 'angular-auth-oidc-client';
import { AuthCallbackComponent } from './auth-callback-component/auth-callback-component.component';


@NgModule({
    imports: [AuthModule.forRoot({
        config: {
              authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_q9Xms5GrK',
              redirectUrl: window.location.origin + '/auth/callback',
              postLogoutRedirectUri: window.location.origin,
              clientId: '747q2lrgclnc0r346dtpcn45b3',
              scope: 'phone openid email', // 'openid profile offline_access ' + your scopes
              responseType: 'code',
              silentRenew: true,
              useRefreshToken: true,
              renewTimeBeforeTokenExpiresInSeconds: 30,
              secureRoutes: ['https://d2rqofygb4guyk.cloudfront.net/api'],
          }
      })],
    exports: [AuthModule],
    declarations: [
      AuthCallbackComponent
    ],
})
export class AuthConfigModule {}
