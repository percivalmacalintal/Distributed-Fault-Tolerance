const db = require('./db');

class Enrollment {
  static async all() {
    const [rows] = await db.query('SELECT * FROM enrollments');
    return rows;
  }

  static async allWithDetails() {
    const [rows] = await db.query(`
      SELECT 
        e.id,
        e.student_id,
        e.offering_id,
        e.grade,
        u.email AS student_email,
        co.id AS course_offering_id
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.offering_id = co.id
    `);
    return rows;
  }

  static async create(studentId, offeringId, grade = null) {
    const [result] = await db.query(
      `
      INSERT INTO enrollments (student_id, offering_id, grade)
      VALUES (?, ?, ?)
      `,
      [studentId, offeringId, grade]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async updateGrade(id, grade) {
    await db.query(
      'UPDATE enrollments SET grade = ? WHERE id = ?',
      [grade, id]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM enrollments WHERE id = ?', [id]);
  }

  static async getEnrollmentsWithGrade(studentId) {
    const [rows] = await db.query(`
      SELECT 
        e.id,
        c.code AS courseCode,
        c.units,
        co.section,
        co.school_year AS schoolYear,
        co.term,
        e.grade
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE e.student_id = ? AND e.grade IS NOT NULL
      ORDER BY co.school_year, co.term, c.code
    `, [studentId]);

    return rows;
  }
  
}

module.exports = Enrollment;
