const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --------------------
// Database Connection
// --------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",        
  database: "voicescript_db"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});


// --------------------
//     SIGN UP ROUTE
// --------------------
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Check if fields exist
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if email or username already exists
    const checkQuery = "SELECT * FROM users WHERE email = ? OR username = ?";
    db.query(checkQuery, [email, username], async (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (result.length > 0) {
        return res.status(400).json({
          message: "Username or Email already exists"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into DB
      const insertQuery = `
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `;

      db.query(insertQuery, [username, email, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ message: "Insert error" });

        return res.status(201).json({
          message: "User created successfully",
          userId: result.insertId
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});



app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = result[0];

    try {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Update last login
      db.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id], (err) => {
        if (err) console.error("Failed to update last login:", err);
      });

      return res.status(200).json({
        message: "Login successful",
        userId: user.id,
        username: user.username,
        email: user.email
      });
    } catch (bcryptErr) {
      console.error("Bcrypt error:", bcryptErr);
      return res.status(500).json({ message: "Server error during password check" });
    }
  });
});


// --------------------
// Start Server
// --------------------
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
