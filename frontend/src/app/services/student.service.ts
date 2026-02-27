import { Injectable } from '@angular/core';

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
  private readonly students: Student[] = [
    { id: 1, name: 'Alice Johnson', age: 20, major: 'Computer Science' },
    { id: 2, name: 'Brian Lee', age: 21, major: 'Information Systems' },
    { id: 3, name: 'Chloe Wang', age: 19, major: 'Mathematics' }
  ];

  constructor() { }

  getStudents(): Student[] {
    return this.students;
  }

  getStudentById(id: number): Student | undefined {
    return this.students.find(student => student.id === id);
  }
}
