// core/interceptors/error.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'حدث خطأ غير متوقع';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          // Server-side error: prefer JSON message, then string error, then default
          if (error.error && typeof error.error === 'object' && error.error.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else {
            errorMessage = error.message || errorMessage;
          }
          
          // Truncate if it looks like garbage/HTML/headers (very long)
          if (errorMessage.length > 300) {
            errorMessage = errorMessage.substring(0, 250) + '... (عرض التفاصيل في Console)';
          }

          if (error.status === 0) {
            errorMessage = 'تعذر الاتصال بالخادم. تأكد من تشغيل الـ Backend واتصالك بالإنترنت.';
            console.error('[Connectivity Error] Status 0 detected. Possible CORS or Server Down.');
            console.dir(error);
          }

          switch (error.status) {
            case 401:
              errorMessage = 'انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى';
              this.auth.logout();
              this.router.navigate(['/auth/login']);
              break;
            case 403:
              errorMessage = 'ليس لديك صلاحية للوصول إلى هذا المورد';
              break;
            case 404:
              errorMessage = 'المورد المطلوب غير موجود';
              break;
            case 500:
              // For 500, we already extracted the message above
              console.error('CRITICAL SERVER 500:', error);
              break;
          }
        }

        console.error('Final Intercepted Error Message:', errorMessage);
        this.toastr.error(errorMessage, 'خطأ');
        return throwError(() => error);
      })
    );
  }
}