const express = require("express");
const cors = require("cors");
const session = require("express-session");

// Import routes
const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production (HTTPS)
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Important for cross-origin requests
  },
  name: 'connect.sid' // Explicit session cookie name
}));

app.use(express.json());
// CORS configuration - allow multiple origins for development
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ["http://localhost:5173", "http://localhost:3000"]; // Vite and Create React App default ports

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow cookies to be sent
}));
app.use(express.urlencoded({ extended: true }));

// Import database connection (this will initialize the connection)
require("./config/database");

// --------------------
//     ROUTES
// --------------------
app.use("/", authRoutes);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// API routes
app.use("/api/notes", noteRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes); // Admin routes must come before other catch-all routes
app.use("/api/feedback", feedbackRoutes);

// --------------------
// Start Server
// --------------------
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Available routes:");
  console.log("  POST /register");
  console.log("  POST /login");
  console.log("  POST /logout");
  console.log("  GET  /api/me");
  console.log("  GET  /api/is-admin");
  console.log("  GET  /api/test");
  console.log("  GET  /api/notes/:userId");
  console.log("  GET  /api/notes/search/:userId?q=query");
  console.log("  POST /api/notes");
  console.log("  PUT  /api/notes/:noteId");
  console.log("  DELETE /api/notes/:noteId");
  console.log("  POST /api/notes/:noteId/duplicate");
  console.log("  POST /api/notes/upload");
  console.log("  GET  /api/user/:userId");
  console.log("  PUT  /api/user/:userId");
  console.log("  GET  /api/categories/:userId");
  console.log("  POST /api/categories");
  console.log("  PUT  /api/categories/:categoryId");
  console.log("  DELETE /api/categories/:categoryId");
  console.log("  GET  /api/admin/dashboard");
  console.log("  GET  /api/admin/users/statistics");
  console.log("  GET  /api/admin/check");
  console.log("  POST /api/feedback/notes/:noteId");
  console.log("  GET  /api/feedback/notes/:noteId");
  console.log("  GET  /api/feedback/user");
  console.log("  GET  /api/feedback/admin/all");
  console.log("  GET  /api/feedback/admin/statistics");
});
