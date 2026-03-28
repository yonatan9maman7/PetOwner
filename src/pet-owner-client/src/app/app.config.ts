import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from './i18n/http-loader.factory';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { baseUrlInterceptor } from './interceptors/base-url.interceptor';
import { API_BASE_URL } from './api-base.token';
import { environment } from '../environments/environment';

const apiOrigin = environment.apiUrl
  ? environment.apiUrl.replace(/\/api\/?$/, '')
  : '';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: apiOrigin },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor, baseUrlInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
        lang: 'he',
        fallbackLang: 'he',
      }),
    ),
  ],
};
