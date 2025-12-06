const db = require('./db'); 

class CourseOffering {

  static async all() {
    const [rows] = await db.query('SELECT * FROM course_offerings');
    return rows;
  }

  static async allWithDetails() {
    const [rows] = await db.query(`
      SELECT 
        co.id,
        co.course_id,
        c.code AS course_code,
        c.units AS course_units,

        co.faculty_id,
        u.email AS faculty_email,

        co.section,
        co.school_year,
        co.term,
        co.capacity,
        co.is_open

      FROM course_offerings co
      JOIN courses c ON co.course_id = c.id
      JOIN users u ON co.faculty_id = u.id
      ORDER BY c.code, co.section
    `);

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM course_offerings WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async create({ course_id, faculty_id, section, school_year, term, capacity = 45, is_open = 1 }) {
    const [result] = await db.query(
      `
      INSERT INTO course_offerings
        (course_id, faculty_id, section, school_year, term, capacity, is_open)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [course_id, faculty_id, section, school_year, term, capacity, is_open]
    );

    return result.insertId;
  }

  static async update(id, { course_id, faculty_id, section, school_year, term, capacity, is_open }) {
    await db.query(
      `
      UPDATE course_offerings
      SET course_id = ?, faculty_id = ?, section = ?, school_year = ?, term = ?, capacity = ?, is_open = ?
      WHERE id = ?
      `,
      [course_id, faculty_id, section, school_year, term, capacity, is_open, id]
    );
  }

  static async toggleOpen(id) {
    await db.query(`
      UPDATE course_offerings
      SET is_open = IF(is_open = 1, 0, 1)
      WHERE id = ?
    `, [id]);
  }

  // Delete offering
  static async delete(id) {
    await db.query('DELETE FROM course_offerings WHERE id = ?', [id]);
  }

  static async listWithEnrollmentCount() {
    let sql = `
    SELECT
        co.id,
        c.code AS courseCode,
        c.units,
        co.section,
        co.school_year AS schoolYear,
        co.term,
        co.capacity,
        u.email AS facultyEmail,
        COUNT(e.id) AS enrolledCount
        
    FROM course_offerings co
    JOIN courses c ON co.course_id = c.id
    JOIN users u ON co.faculty_id = u.id
    LEFT JOIN enrollments e ON e.offering_id = co.id

    GROUP BY
        co.id, c.code, c.units, co.section,
        co.school_year, co.term, co.capacity, u.email

    ORDER BY 
        co.school_year, co.term DESC, c.code, co.section
    `;
    const [rows] = await db.query(sql);
    return rows;
  }
}

module.exports = CourseOffering;
