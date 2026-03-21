import { InjectionToken } from '@angular/core';

/**
 * Backend origin (scheme + host + port), no trailing slash.
 * Use '' for same-origin requests (Angular dev proxy or a reverse proxy in production).
 * Set to e.g. http://localhost:5000 when the API runs on another origin without a proxy.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
