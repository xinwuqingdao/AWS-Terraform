package com.example.studentservice.service;

import com.example.studentservice.model.Student;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {

    private final List<Student> students = List.of(
        new Student(1L, "Alice Johnson", 20, "Computer Science"),
        new Student(2L, "Brian Lee", 21, "Information Systems"),
        new Student(3L, "Chloe Wang", 19, "Mathematics")
    );

    public List<Student> getStudentList() {
        return students;
    }

    public Optional<Student> getStudentById(Long id) {
        return students.stream().filter(student -> student.getId().equals(id)).findFirst();
    }
}
