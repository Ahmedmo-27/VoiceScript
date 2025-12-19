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

  static create(userId, name, color = "#007bff") {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)";
      db.query(query, [userId, name, color], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  static update(categoryId, updates) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (updates.name !== undefined) {
        updateFields.push("name = ?");
        values.push(updates.name);
      }
      if (updates.color !== undefined) {
        updateFields.push("color = ?");
        values.push(updates.color);
      }

      if (updateFields.length === 0) {
        return reject(new Error("No fields to update"));
      }

      values.push(categoryId);
      const query = `UPDATE categories SET ${updateFields.join(", ")} WHERE id = ?`;
      db.query(query, values, (err, result) => {
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

