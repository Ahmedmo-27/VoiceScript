const CategoryModel = require("../models/CategoryModel");

class CategoryController {
  static async getUserCategories(req, res) {
    const { userId } = req.params;

    try {
      const categories = await CategoryModel.findByUserId(userId);
      return res.status(200).json(categories);
    } catch (error) {
      console.error("Get user categories error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async createCategory(req, res) {
    const { userId, name, color } = req.body;

    if (!userId || !name || !name.trim()) {
      return res.status(400).json({ message: "User ID and name are required" });
    }

    try {
      const categoryId = await CategoryModel.create(userId, name.trim(), color || "#007bff");
      const category = await CategoryModel.findById(categoryId);
      return res.status(201).json(category);
    } catch (error) {
      console.error("Create category error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async updateCategory(req, res) {
    const { categoryId } = req.params;
    const { name, color } = req.body;

    const updates = {};
    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }
    if (color !== undefined) {
      updates.color = color;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    try {
      await CategoryModel.update(categoryId, updates);
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.status(200).json(category);
    } catch (error) {
      console.error("Update category error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async deleteCategory(req, res) {
    const { categoryId } = req.params;

    try {
      const result = await CategoryModel.delete(categoryId);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }
}

module.exports = CategoryController;

