CREATE DATABASE IF NOT EXISTS enrollment_system;
USE enrollment_system;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS course_offerings;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    email    VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     ENUM('student', 'faculty') NOT NULL
);

-- Create courses table
CREATE TABLE courses (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    code  VARCHAR(20) NOT NULL UNIQUE,
    units INT NOT NULL
);

-- Create course_offerings table
CREATE TABLE course_offerings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    course_id    INT NOT NULL,
    faculty_id   INT NOT NULL,
    section      VARCHAR(10) NOT NULL,
    school_year  VARCHAR(9) NOT NULL,
    term         INT NOT NULL,
    capacity     INT NOT NULL DEFAULT 45,
    is_open      TINYINT DEFAULT 1,

    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (faculty_id) REFERENCES users(id)
);

-- Create enrollments table
CREATE TABLE enrollments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT NOT NULL,
    offering_id  INT NOT NULL,
    grade        NUMERIC(2,1),

    UNIQUE KEY uniq_enrollment (student_id, offering_id),

    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (offering_id) REFERENCES course_offerings(id)
);

-- Create enrollment_app user and grant privileges (now after table creation)
CREATE USER 'enrollment_app'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON enrollment_system.* TO 'enrollment_app'@'%';
FLUSH PRIVILEGES;

-- Insert sample data into courses table
INSERT INTO courses (code, units) VALUES
('STDISCM', 3),
('CSOPESY', 3),
('THS-ST2', 2);

-- Insert sample data into course_offerings table
INSERT INTO course_offerings (course_id, faculty_id, section, school_year, term, is_open) VALUES
(1, 3, 'S17', '2025-2026', 1, 1),   -- CS101 by faculty1
(1, 4, 'S18', '2025-2026', 1, 1),   -- CS101 by faculty2
(2, 3, 'S19', '2025-2026', 2, 1),   -- CS102 by faculty1
(3, 4, 'S17', '2025-2026', 1, 0);   -- IT201 by faculty2 (closed)

-- Insert sample data into enrollments table
INSERT INTO enrollments (student_id, offering_id, grade) VALUES
(1, 1, NULL),     -- student1 enrolled, not yet graded
(1, 3, '1.50'),   -- student1 graded in CS102 term 2
(2, 2, '2.00');   -- student2 graded in CS101 section B


