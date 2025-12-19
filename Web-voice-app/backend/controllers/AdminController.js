const UserModel = require("../models/UserModel");
const NoteModel = require("../models/NoteModel");
const FeedbackModel = require("../models/FeedbackModel");
const db = require("../config/database");

class AdminController {
  // Get admin dashboard data
  static async getDashboardData(req, res) {
    try {
      // Get user statistics
      const userStats = await AdminController.getUserStatistics();
      
      // Get transcription statistics
      const transcriptionStats = await FeedbackModel.getStatistics();
      const transcriptionStatsTable = await FeedbackModel.getTranscriptionStats();
      
      // Get note statistics
      const noteStats = await AdminController.getNoteStatistics();
      
      // Get feedback statistics
      const feedbackStats = await FeedbackModel.getStatistics();
      
      // Calculate accuracy from feedback
      const overallAccuracy = feedbackStats.overall_accuracy || 100.00;
      const totalErrors = feedbackStats.total_transcription_errors || 0;
      const totalWords = feedbackStats.total_words_processed || 0;
      
      // Get usage data (notes created per day for last 7 days)
      const usageData = await AdminController.getUsageData();
      
      const dashboardData = {
        usage: usageData,
        accuracy: [
          { feature: "Speech to Text", rate: parseFloat(overallAccuracy) },
          { feature: "Transcription Accuracy", rate: parseFloat(overallAccuracy) },
        ],
        kpis: {
          totalUsers: userStats.totalUsers || 0,
          activeUsers: userStats.activeUsers || 0,
          inactiveUsers: userStats.inactiveUsers || 0,
          voiceSessions: noteStats.totalNotes || 0,
          avgAccuracy: parseFloat(overallAccuracy),
          errorRate: totalWords > 0 ? ((totalErrors / totalWords) * 100).toFixed(2) : 0,
          totalTranscriptionErrors: totalErrors,
          totalWordsProcessed: totalWords,
          totalFeedbacks: feedbackStats.total_feedbacks || 0,
        },
        userStatistics: userStats.userTable || [],
        transcriptionStats: {
          overallAccuracy: parseFloat(overallAccuracy),
          totalErrors: totalErrors,
          totalWords: totalWords,
          totalFeedbacks: feedbackStats.total_feedbacks || 0,
          positiveFeedbacks: feedbackStats.positive_feedbacks || 0,
          negativeFeedbacks: feedbackStats.negative_feedbacks || 0,
        },
      };

      return res.status(200).json(dashboardData);
    } catch (error) {
      console.error("Get dashboard data error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  // Get user statistics
  static async getUserStatistics() {
    return new Promise((resolve, reject) => {
      const query = `SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactiveUsers
        FROM users`;
      
      db.query(query, [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const stats = result[0];
          
          // Get detailed user table with statistics
          const userTableQuery = `SELECT 
            u.id,
            u.username,
            u.email,
            u.role,
            u.created_at,
            u.last_login,
            u.is_active,
            COUNT(DISTINCT n.id) as total_notes,
            COUNT(DISTINCT f.id) as total_feedbacks,
            COALESCE(SUM(f.error_count), 0) as total_errors,
            COALESCE(AVG(f.accuracy), 100.00) as avg_accuracy
            FROM users u
            LEFT JOIN notes n ON u.id = n.user_id
            LEFT JOIN feedback f ON u.id = f.user_id
            GROUP BY u.id, u.username, u.email, u.role, u.created_at, u.last_login, u.is_active
            ORDER BY u.created_at DESC`;
          
          db.query(userTableQuery, [], (err, userTable) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                ...stats,
                userTable: userTable.map(user => ({
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  role: user.role || 'user',
                  createdAt: user.created_at,
                  lastLogin: user.last_login,
                  isActive: user.is_active !== 0,
                  totalNotes: user.total_notes || 0,
                  totalFeedbacks: user.total_feedbacks || 0,
                  totalErrors: parseInt(user.total_errors) || 0,
                  avgAccuracy: parseFloat(user.avg_accuracy) || 100.00
                }))
              });
            }
          });
        }
      });
    });
  }

  // Get note statistics
  static async getNoteStatistics() {
    return new Promise((resolve, reject) => {
      const query = `SELECT 
        COUNT(*) as totalNotes,
        COUNT(DISTINCT user_id) as usersWithNotes
        FROM notes`;
      
      db.query(query, [], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });
  }

  // Get usage data (notes created per day for last 7 days)
  static async getUsageData() {
    return new Promise((resolve, reject) => {
      const query = `SELECT 
        DATE(created_at) as date,
        DAYNAME(created_at) as dayName,
        COUNT(*) as sessions
        FROM notes
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at), DAYNAME(created_at)
        ORDER BY date ASC`;
      
      db.query(query, [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Format for frontend
          const usage = result.map(row => ({
            date: row.dayName.substring(0, 3), // Mon, Tue, etc.
            sessions: row.sessions
          }));
          
          // Fill in missing days with 0
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const usageMap = {};
          usage.forEach(item => {
            usageMap[item.date] = item.sessions;
          });
          
          const fullUsage = days.map(day => ({
            date: day,
            sessions: usageMap[day] || 0
          }));
          
          resolve(fullUsage);
        }
      });
    });
  }

  // Get user statistics table (separate endpoint for detailed user table)
  static async getUserStatisticsTable(req, res) {
    try {
      const userStats = await AdminController.getUserStatistics();
      return res.status(200).json({
        users: userStats.userTable || [],
        summary: {
          totalUsers: userStats.totalUsers || 0,
          activeUsers: userStats.activeUsers || 0,
          inactiveUsers: userStats.inactiveUsers || 0
        }
      });
    } catch (error) {
      console.error("Get user statistics table error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  // Check if user is admin - checks logged-in user's role from database
  static async checkAdmin(req, res) {
    try {
      // Check if user is authenticated
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
          message: "Not authenticated", 
          isAdmin: false,
          role: null
        });
      }

      // Get user from database using session userId
      const user = await UserModel.findById(req.session.userId);
      
      if (!user) {
        return res.status(401).json({ 
          message: "User not found", 
          isAdmin: false,
          role: null
        });
      }

      // Check role from database (case-insensitive, trimmed)
      const userRole = user.role ? user.role.toString().trim().toLowerCase() : 'user';
      const isAdmin = userRole === 'admin';

      return res.status(200).json({ 
        isAdmin,
        role: user.role || 'user'
      });
    } catch (error) {
      console.error("Check admin error:", error);
      return res.status(500).json({ 
        message: "Server error", 
        isAdmin: false,
        role: null
      });
    }
  }
}

module.exports = AdminController;

