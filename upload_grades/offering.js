const db = require('./db'); 

class CourseOffering {

  static async getOfferingByFaculty(facultyId) {
    const [rows] = await db.query(`
      SELECT 
        co.id AS offeringId,
        co.course_id,
        c.code AS courseCode,
        c.units,
        co.section,
        co.school_year AS schoolYear,
        co.term

      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      WHERE co.faculty_id = ? 
      ORDER BY c.code, co.section
    `, [facultyId]);

    return rows;
  }

  static async listStudentsForOfferingWithHeader(offeringId) {
      const [rows] = await db.query(`
      SELECT 
        e.student_id,
        u.email AS studentEmail,
        e.id AS enrollmentId,
        e.grade,
        c.code AS courseCode,
        co.id AS offeringId,
        co.course_id,
        co.section,
        co.school_year AS schoolYear,
        co.term

      FROM courses c 
      JOIN course_offerings co ON c.id = co.course_id
      JOIN enrollments e ON e.offering_id = co.id
      JOIN users u ON u.id = e.student_id
      WHERE co.id = ?
      ORDER BY e.id
    `, [offeringId]);
    
    const offeringHeader = {
        id: rows[0].offeringId,
        courseCode: rows[0].courseCode,
        section: rows[0].section,
        schoolYear: rows[0].schoolYear,
        term: String(rows[0].term)
    };

    const enrollments = rows.map(r => ({
        enrollmentId: r.enrollmentId,
        studentEmail: r.studentEmail,
        grade: parseFloat(r.grade) || 0.0, 
    }));

    return {offerings: offeringHeader, enrollments};
  }
  static async setGradeForEnrollment(enrollmentId, grade) {
    const [updateResult] = await db.query(`
        UPDATE enrollments
        SET grade = ?
        WHERE id = ?
    `, [grade, enrollmentId]);
  }
}

module.exports = CourseOffering;
