const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");

// Order matters: specific routes first, then parameterized routes
router.post("/", CategoryController.createCategory);
router.get("/:userId", CategoryController.getUserCategories);
router.put("/:categoryId", CategoryController.updateCategory);
router.delete("/:categoryId", CategoryController.deleteCategory);

module.exports = router;

