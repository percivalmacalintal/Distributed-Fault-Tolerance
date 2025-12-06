const db = require('./db');

class Register {
  static async create(email, password, role) {
    const [result] = await db.query(
      `
      INSERT INTO users (student_id, offering_id, grade)
      VALUES (?, ?, ?)
      `,
      [email, password, role]
    );
    
  }


}

module.exports = Enrollment;
