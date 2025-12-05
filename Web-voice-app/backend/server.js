const express = require("express");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();
app.use(express.json());
app.use(cors());

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

// --------------------
// Start Server
// --------------------
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Available routes:");
  console.log("  POST /register");
  console.log("  POST /login");
  console.log("  GET  /api/test");
  console.log("  GET  /api/notes/:userId");
  console.log("  GET  /api/notes/:userId/search?q=query");
  console.log("  POST /api/notes");
  console.log("  PUT  /api/notes/:noteId");
  console.log("  DELETE /api/notes/:noteId");
  console.log("  POST /api/notes/:noteId/duplicate");
  console.log("  GET  /api/user/:userId");
  console.log("  PUT  /api/user/:userId");
  console.log("  GET  /api/categories/:userId");
  console.log("  POST /api/categories");
  console.log("  PUT  /api/categories/:categoryId");
  console.log("  DELETE /api/categories/:categoryId");
});
