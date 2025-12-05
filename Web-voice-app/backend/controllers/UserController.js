const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

class UserController {
  static async getProfile(req, res) {
    const { userId } = req.params;

    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }

  static async updateProfile(req, res) {
    const { userId } = req.params;
    const { username, email, password } = req.body;

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;

    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.password_hash = hashedPassword;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      await UserModel.update(userId, updates);
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Database error" });
    }
  }
}

module.exports = UserController;

