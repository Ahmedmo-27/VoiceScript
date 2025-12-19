const UserModel = require('../models/UserModel');

class AuthMiddleware {
    // Check if user is authenticated
    static isAuthenticated(req, res, next) {
        if (req.session && req.session.userId) {
            next();
        } else {
            return res.status(401).json({
                success: false,
                message: "Please login to access this resource"
            });
        }
    }

    // Check if user is a guest (for login/register pages)
    static isGuest(req, res, next) {
        if (!req.session.userId) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "You are already logged in"
            });
        }
    }

    // Attach user data to request if authenticated
    static async attachUser(req, res, next) {
        if (req.session && req.session.userId) {
            try {
                const user = await UserModel.findById(req.session.userId);
                if (user) {
                    // Remove password hash from user object
                    const { password_hash, ...userWithoutPassword } = user;
                    req.user = userWithoutPassword;
                }
            } catch (error) {
                console.error("Error attaching user:", error);
                // Don't throw error, just continue without user
            }
        }
        next();
    }

    // Optional: Check for specific user roles
    static requireRole(role) {
        return async (req, res, next) => {
            try {
                if (!req.session.userId) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required"
                    });
                }

                const user = await UserModel.findById(req.session.userId);
                if (!user || user.role !== role) {
                    return res.status(403).json({
                        success: false,
                        message: "Insufficient permissions"
                    });
                }

                req.user = user;
                next();
            } catch (error) {
                console.error("Role check error:", error);
                return res.status(500).json({
                    success: false,
                    message: "Server error"
                });
            }
        };
    }
}

module.exports = AuthMiddleware;