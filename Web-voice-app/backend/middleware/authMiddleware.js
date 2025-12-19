const UserModel = require("../models/UserModel");

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify user still exists
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify user still exists and is admin
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Alias for backward compatibility
const isAuthenticated = requireAuth;

module.exports = {
  requireAuth,
  requireAdmin,
  isAuthenticated
};
