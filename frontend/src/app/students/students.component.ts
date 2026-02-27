import { Component } from '@angular/core';
import { Student, StudentService } from '../services/student.service';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent {
  students: Student[] = [];

  constructor(private readonly studentService: StudentService) {
    this.students = this.studentService.getStudents();
  }

}
