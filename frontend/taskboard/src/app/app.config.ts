import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { APP_SETTINGS, AppSettings } from './app.settings';
import { JwtInterceptor } from './auth/interceptors/jwt.interceptor';

const settings: AppSettings = {
  apiBaseUrl: 'http://localhost:8000'
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: APP_SETTINGS, useValue: settings },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ]
};
