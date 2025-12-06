const db = require('./db');

class User {
  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }
}

module.exports = User;