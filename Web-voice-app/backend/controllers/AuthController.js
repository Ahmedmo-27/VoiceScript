const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

class AuthController {
  static async register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      const existingUsers = await UserModel.findByEmailOrUsername(email, username);
      if (existingUsers.length > 0) {
        return res.status(400).json({
          message: "Username or Email already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await UserModel.create(username, email, hashedPassword);

      return res.status(201).json({
        message: "User created successfully",
        userId: userId
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Update last login
      UserModel.updateLastLogin(user.id).catch(err => 
        console.error("Failed to update last login:", err)
      );

      return res.status(200).json({
        message: "Login successful",
        userId: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = AuthController;

