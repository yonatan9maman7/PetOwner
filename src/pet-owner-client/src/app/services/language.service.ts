import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'app_lang';

export type AppLanguage = 'he' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly currentLang = signal<AppLanguage>('he');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    const initial: AppLanguage = stored === 'en' || stored === 'he' ? stored : 'he';
    this.applyLanguage(initial);
  }

  setLanguage(lang: AppLanguage): void {
    this.applyLanguage(lang);
  }

  toggleLanguage(): void {
    this.applyLanguage(this.currentLang() === 'he' ? 'en' : 'he');
  }

  private applyLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    this.currentLang.set(lang);
  }
}
