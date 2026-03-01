import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Student {
  id: number;
  name: string;
  age: number;
  major: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly baseUrl = 'http://localhost:8080/api/students';

  constructor(private readonly http: HttpClient) { }

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.baseUrl}/getStudentList`);
  }

  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.baseUrl}/${id}`);
  }
}
