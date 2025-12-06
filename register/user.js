const db = require('./db');

class User {
    static async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    }
    static async createUser(email, password, role) {
        const [result] = await db.query(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, password, role]
        );

        const [rows] = await db.query(
            'SELECT * FROM users WHERE id = ?',
            [result.insertId]
        );

        return rows[0] || null;
    }
}

module.exports = User;