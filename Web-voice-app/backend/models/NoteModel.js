const db = require("../config/database");

class NoteModel {
  static findByUserId(userId, categoryId = null) {
    return new Promise((resolve, reject) => {
      let query = "SELECT n.*, c.name as category_name FROM notes n LEFT JOIN categories c ON n.category_id = c.id WHERE n.user_id = ?";
      const params = [userId];
      
      if (categoryId) {
        query += " AND n.category_id = ?";
        params.push(categoryId);
      }
      
      query += " ORDER BY n.pinned DESC, n.updated_at DESC";
      
      db.query(query, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static findById(noteId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM notes WHERE id = ?";
      db.query(query, [noteId], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  static create(userId, title, content, color = "#ffffff", categoryId = null) {
    return new Promise((resolve, reject) => {
      const query = "INSERT INTO notes (user_id, title, content, color, category_id) VALUES (?, ?, ?, ?, ?)";
      db.query(query, [userId, title, content || "", color, categoryId], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  static update(noteId, updates) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (updates.title !== undefined) {
        updateFields.push("title = ?");
        values.push(updates.title);
      }
      if (updates.content !== undefined) {
        updateFields.push("content = ?");
        values.push(updates.content);
      }
      if (updates.color !== undefined) {
        updateFields.push("color = ?");
        values.push(updates.color);
      }
      if (updates.pinned !== undefined) {
        updateFields.push("pinned = ?");
        values.push(updates.pinned ? 1 : 0);
      }
      if (updates.category_id !== undefined) {
        updateFields.push("category_id = ?");
        values.push(updates.category_id);
      }

      if (updateFields.length === 0) {
        return reject(new Error("No fields to update"));
      }

      values.push(noteId);
      const query = `UPDATE notes SET ${updateFields.join(", ")} WHERE id = ?`;
      db.query(query, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static delete(noteId) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM notes WHERE id = ?";
      db.query(query, [noteId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static search(userId, searchTerm) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY pinned DESC, updated_at DESC";
      const searchPattern = `%${searchTerm}%`;
      db.query(query, [userId, searchPattern, searchPattern], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static duplicate(noteId, userId) {
    return new Promise((resolve, reject) => {
      // First get the original note
      this.findById(noteId).then((note) => {
        if (!note || note.user_id !== userId) {
          return reject(new Error("Note not found or unauthorized"));
        }
        // Create a duplicate
        this.create(userId, `${note.title} (Copy)`, note.content, note.color).then((newId) => {
          resolve(newId);
        }).catch(reject);
      }).catch(reject);
    });
  }
}

module.exports = NoteModel;

