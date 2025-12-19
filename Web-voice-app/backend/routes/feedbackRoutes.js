const express = require("express");
const router = express.Router();
const FeedbackController = require("../controllers/FeedbackController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(requireAuth);

// User routes
router.post("/notes/:noteId", FeedbackController.createFeedback);
router.get("/notes/:noteId", FeedbackController.getNoteFeedback);
router.get("/user", FeedbackController.getUserFeedback);

// Admin routes
router.get("/admin/all", requireAdmin, FeedbackController.getAllFeedback);
router.get("/admin/statistics", requireAdmin, FeedbackController.getFeedbackStatistics);

module.exports = router;

