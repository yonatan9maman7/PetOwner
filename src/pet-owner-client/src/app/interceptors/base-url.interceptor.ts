import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.apiUrl) return next(req);

  const origin = environment.apiUrl.replace(/\/api\/?$/, '');

  if (req.url.startsWith('/api/') || req.url.startsWith('/api?') ||
      req.url.startsWith('/hubs/') || req.url === '/api') {
    req = req.clone({ url: `${origin}${req.url}` });
  }

  return next(req);
};
