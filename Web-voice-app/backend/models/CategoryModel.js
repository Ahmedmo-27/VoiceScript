const db = require("../config/database");

class CategoryModel {
  static findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC";
      db.query(query, [userId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static findById(categoryId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM categories WHERE id = ?";
      db.query(query, [categoryId], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  static create(userId, name) {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO categories (user_id, name) VALUES (?, ?)";
      db.query(query, [userId, name], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  static update(categoryId, name) {
    return new Promise((resolve, reject) => {
      const query = "UPDATE categories SET name = ? WHERE id = ?";
      db.query(query, [name, categoryId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static delete(categoryId) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM categories WHERE id = ?";
      db.query(query, [categoryId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

module.exports = CategoryModel;

