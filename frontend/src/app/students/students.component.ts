import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Student, StudentService } from '../services/student.service';

import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent implements OnInit, OnDestroy {
  private readonly oidcSecurityService = inject(OidcSecurityService);
  private readonly destroy$ = new Subject<void>();

  students: Student[] = [];
  loadError = '';
  isAuthenticated = false;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.oidcSecurityService
      .checkAuth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ isAuthenticated }) => {
          this.isAuthenticated = isAuthenticated;

          if (!isAuthenticated) {
            this.oidcSecurityService.authorize();
            return;
          }

          this.loadStudents();
        },
        error: () => {
          this.loadError = 'Failed to verify authentication status.';
        }
      });
  }

  login(): void {
    this.oidcSecurityService.authorize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStudents(): void {
    this.studentService.getStudents().pipe(takeUntil(this.destroy$)).subscribe({
      next: (students) => {
        this.students = students;
      },
      error: () => {
        this.loadError = 'Failed to load students from backend service.';
      }
    });
  }
}
