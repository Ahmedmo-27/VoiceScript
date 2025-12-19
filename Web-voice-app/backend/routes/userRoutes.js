const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const AuthMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(AuthMiddleware.isAuthenticated);

router.get("/:userId", UserController.getProfile);
router.put("/:userId", UserController.updateProfile);

module.exports = router;

