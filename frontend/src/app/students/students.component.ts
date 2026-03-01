import { Component, OnInit } from '@angular/core';
import { Student, StudentService } from '../services/student.service';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  loadError = '';

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
      },
      error: () => {
        this.loadError = 'Failed to load students from backend service.';
      }
    });
  }

}
