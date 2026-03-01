import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-auth-callback-component',
  templateUrl: './auth-callback-component.component.html',
  styleUrls: ['./auth-callback-component.component.css']
})
export class AuthCallbackComponent implements OnInit, OnDestroy {
  private readonly oidcSecurityService = inject(OidcSecurityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly destroy$ = new Subject<void>();

  error: string | null = null;

  ngOnInit(): void {
    // If you pass return=/some/path in the redirect URL, you can restore it:
    const returnUrlFromQuery =
      this.route.snapshot.queryParamMap.get('return') ||
      '/';

    // IMPORTANT: completes the Code Flow (reads "code" from URL, exchanges for tokens)
    this.oidcSecurityService
      .checkAuth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ isAuthenticated }) => {
          if (!isAuthenticated) {
            this.error = 'Authentication failed (not authenticated).';
            // Optional: send them to login again
            this.router.navigateByUrl('/');
            return;
          }

          // Navigate to the original destination (or home)
          this.router.navigateByUrl(returnUrlFromQuery);
        },
        error: (e) => {
          console.error('OIDC callback error', e);
          this.error =
            'Authentication error. Please try again, or contact support.';
          this.router.navigateByUrl('/');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}