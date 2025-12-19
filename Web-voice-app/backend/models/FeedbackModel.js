const db = require("../config/database");

class FeedbackModel {
  // Create a new feedback entry
  static create(noteId, userId, totalWords, errorCount, errorWords, feedbackType = 'negative') {
    return new Promise((resolve, reject) => {
      // Calculate accuracy: (total_words - error_count) / total_words * 100
      const accuracy = totalWords > 0 
        ? ((totalWords - errorCount) / totalWords * 100).toFixed(2)
        : 100.00;

      const query = `INSERT INTO feedback 
        (note_id, user_id, total_words, error_count, error_words, accuracy, feedback_type) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      db.query(query, [noteId, userId, totalWords, errorCount, errorWords || null, accuracy, feedbackType], (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      });
    });
  }

  // Get feedback by note ID
  static findByNoteId(noteId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM feedback WHERE note_id = ? ORDER BY created_at DESC";
      db.query(query, [noteId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Get feedback by user ID
  static findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = "SELECT f.*, n.title as note_title FROM feedback f LEFT JOIN notes n ON f.note_id = n.id WHERE f.user_id = ? ORDER BY f.created_at DESC";
      db.query(query, [userId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Get all feedbacks (for admin)
  static findAll(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `SELECT f.*, n.title as note_title, u.username as user_name 
        FROM feedback f 
        LEFT JOIN notes n ON f.note_id = n.id 
        LEFT JOIN users u ON f.user_id = u.id 
        ORDER BY f.created_at DESC 
        LIMIT ? OFFSET ?`;
      db.query(query, [limit, offset], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Get feedback statistics
  static getStatistics() {
    return new Promise((resolve, reject) => {
      const query = `SELECT 
        COUNT(*) as total_feedbacks,
        SUM(error_count) as total_transcription_errors,
        SUM(total_words) as total_words_processed,
        AVG(accuracy) as overall_accuracy,
        SUM(CASE WHEN feedback_type = 'positive' THEN 1 ELSE 0 END) as positive_feedbacks,
        SUM(CASE WHEN feedback_type = 'negative' THEN 1 ELSE 0 END) as negative_feedbacks
        FROM feedback`;
      db.query(query, [], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  // Update transcription stats table
  static updateStats() {
    return new Promise((resolve, reject) => {
      // First get current stats
      this.getStatistics().then(stats => {
        const query = `UPDATE transcription_stats SET 
          total_feedbacks = ?,
          total_transcription_errors = ?,
          total_words_processed = ?,
          overall_accuracy = ?,
          updated_at = NOW()`;
        
        db.query(query, [
          stats.total_feedbacks || 0,
          stats.total_transcription_errors || 0,
          stats.total_words_processed || 0,
          stats.overall_accuracy || 100.00
        ], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }).catch(reject);
    });
  }

  // Get transcription stats
  static getTranscriptionStats() {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM transcription_stats LIMIT 1";
      db.query(query, [], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }
}

module.exports = FeedbackModel;

