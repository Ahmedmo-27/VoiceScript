const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/api/me", AuthController.getCurrentUser);
router.get("/api/is-admin", AuthController.isAdmin);

module.exports = router;

