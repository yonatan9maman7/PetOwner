import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        toast.error('Session expired — please log in again.');
        auth.logout();
      } else if (err.status === 403) {
        toast.error('You don\'t have permission to perform this action.');
      } else if (err.status >= 400 && err.status < 500) {
        const message = extractMessage(err) ?? 'Something went wrong with your request.';
        toast.error(message);
      } else if (err.status >= 500) {
        toast.error('Server error — please try again later.');
      } else if (err.status === 0) {
        toast.error('Network error — check your connection.');
      }

      return throwError(() => err);
    })
  );
};

function extractMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (typeof body === 'string') return body;
  if (body?.message) return body.message;
  if (body?.title) return body.title;
  return null;
}
