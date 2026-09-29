import { HttpInterceptorFn } from '@angular/common/http';

export const requestIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.includes('/api/v1/')) return next(request);

  return next(
    request.clone({
      setHeaders: { 'X-Request-ID': crypto.randomUUID() },
    }),
  );
};
