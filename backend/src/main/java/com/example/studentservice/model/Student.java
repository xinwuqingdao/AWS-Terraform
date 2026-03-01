package com.example.studentservice.model;

public class Student {
    private Long id;
    private String name;
    private Integer age;
    private String major;

    public Student(Long id, String name, Integer age, String major) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.major = major;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getAge() {
        return age;
    }

    public String getMajor() {
        return major;
    }
}
