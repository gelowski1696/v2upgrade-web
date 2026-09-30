import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { requestIdInterceptor } from './core/api/request-id.interceptor';
import { AnalyticsErrorHandler } from './core/analytics/analytics-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([requestIdInterceptor])),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: AnalyticsErrorHandler },
  ],
};
