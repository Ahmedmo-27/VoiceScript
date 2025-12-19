const db = require("../config/database");

class UserModel {
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = "SELECT id, username, email, password_hash, role, created_at, updated_at, is_active, last_login FROM users WHERE email = ?";
      db.query(query, [email], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  static findByEmailOrUsername(email, username) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE email = ? OR username = ?";
      db.query(query, [email, username], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static create(username, email, passwordHash, role = 'user') {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)";
      db.query(query, [username, email, passwordHash, role], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  static findById(userId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT id, username, email, role, created_at, updated_at, is_active, last_login FROM users WHERE id = ?";
      db.query(query, [userId], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  static update(userId, updates) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (updates.username) {
        updateFields.push("username = ?");
        values.push(updates.username);
      }
      if (updates.email) {
        updateFields.push("email = ?");
        values.push(updates.email);
      }
      if (updates.password_hash) {
        updateFields.push("password_hash = ?");
        values.push(updates.password_hash);
      }

      if (updateFields.length === 0) {
        return reject(new Error("No fields to update"));
      }

      values.push(userId);
      const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      db.query(query, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const query = "UPDATE users SET last_login = NOW() WHERE id = ?";
      db.query(query, [userId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

module.exports = UserModel;

