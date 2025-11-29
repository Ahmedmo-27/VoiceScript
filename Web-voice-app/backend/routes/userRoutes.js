const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");

router.get("/:userId", UserController.getProfile);
router.put("/:userId", UserController.updateProfile);

module.exports = router;

