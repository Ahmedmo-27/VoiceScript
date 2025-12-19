const FeedbackModel = require("../models/FeedbackModel");
const NoteModel = require("../models/NoteModel");

class FeedbackController {
  // Create feedback for a note
  static async createFeedback(req, res) {
    const { noteId } = req.params;
    const { totalWords, errorCount, errorWords, feedbackType } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!noteId) {
      return res.status(400).json({ message: "Note ID is required" });
    }

    // Validate required fields
    if (totalWords === undefined || totalWords === null) {
      return res.status(400).json({ message: "Total words count is required" });
    }

    if (errorCount === undefined || errorCount === null) {
      return res.status(400).json({ message: "Error count is required" });
    }

    // Validate that note exists and belongs to user
    try {
      const note = await NoteModel.findById(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (note.user_id !== userId) {
        return res.status(403).json({ message: "You can only add feedback to your own notes" });
      }

      // Validate feedback type
      const validFeedbackType = feedbackType === 'positive' ? 'positive' : 'negative';
      
      // If feedback type is positive, error count should be 0
      if (validFeedbackType === 'positive' && errorCount > 0) {
        return res.status(400).json({ message: "Positive feedback must have 0 errors" });
      }

      // Validate total words and error count
      if (totalWords < 0) {
        return res.status(400).json({ message: "Total words must be non-negative" });
      }

      if (errorCount < 0) {
        return res.status(400).json({ message: "Error count must be non-negative" });
      }

      if (errorCount > totalWords) {
        return res.status(400).json({ message: "Error count cannot exceed total words" });
      }

      // Create feedback
      const feedbackId = await FeedbackModel.create(
        noteId,
        userId,
        parseInt(totalWords),
        parseInt(errorCount),
        errorWords || null,
        validFeedbackType
      );

      // Update transcription stats
      await FeedbackModel.updateStats().catch(err => 
        console.error("Failed to update stats:", err)
      );

      const feedback = await FeedbackModel.findByNoteId(noteId);
      
      return res.status(201).json({
        message: "Feedback submitted successfully",
        feedbackId: feedbackId,
        feedback: feedback[0]
      });
    } catch (error) {
      console.error("Create feedback error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  // Get feedback for a specific note
  static async getNoteFeedback(req, res) {
    const { noteId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Verify note exists and belongs to user
      const note = await NoteModel.findById(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (note.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const feedback = await FeedbackModel.findByNoteId(noteId);
      return res.status(200).json(feedback);
    } catch (error) {
      console.error("Get note feedback error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Get all feedbacks for current user
  static async getUserFeedback(req, res) {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const feedback = await FeedbackModel.findByUserId(userId);
      return res.status(200).json(feedback);
    } catch (error) {
      console.error("Get user feedback error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Get all feedbacks (admin only)
  static async getAllFeedback(req, res) {
    const { limit = 100, offset = 0 } = req.query;

    try {
      const feedback = await FeedbackModel.findAll(parseInt(limit), parseInt(offset));
      return res.status(200).json(feedback);
    } catch (error) {
      console.error("Get all feedback error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Get feedback statistics (admin only)
  static async getFeedbackStatistics(req, res) {
    try {
      const stats = await FeedbackModel.getStatistics();
      const transcriptionStats = await FeedbackModel.getTranscriptionStats();
      
      return res.status(200).json({
        feedback: stats,
        transcription: transcriptionStats
      });
    } catch (error) {
      console.error("Get feedback statistics error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = FeedbackController;

