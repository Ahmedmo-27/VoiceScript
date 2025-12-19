const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { requireAdmin } = require("../middleware/authMiddleware");

// Test route to verify admin routes are working
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes are working!", path: "/api/admin/test" });
});

// All admin routes require admin authentication
router.get("/dashboard", requireAdmin, AdminController.getDashboardData);
router.get("/users/statistics", requireAdmin, AdminController.getUserStatisticsTable);
router.put("/users/:userId", requireAdmin, AdminController.updateUser);
router.delete("/users/:userId", requireAdmin, AdminController.deleteUser);
router.get("/check", AdminController.checkAdmin);

module.exports = router;

