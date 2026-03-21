import { HttpClient } from '@angular/common/http';
import { TranslateLoader, type TranslationObject } from '@ngx-translate/core';
import { Observable } from 'rxjs';

/**
 * Loads JSON from `/assets/i18n/{lang}.json` (same default as `TranslateHttpLoader`).
 * Current `@ngx-translate/http-loader` constructs the loader via `inject(HttpClient)`;
 * this factory keeps the classic `useFactory` + `HttpClient` pattern from the Epic spec.
 */
export function HttpLoaderFactory(http: HttpClient): TranslateLoader {
  return {
    getTranslation(lang: string): Observable<TranslationObject> {
      return http.get<TranslationObject>(`/assets/i18n/${lang}.json`);
    },
  };
}
