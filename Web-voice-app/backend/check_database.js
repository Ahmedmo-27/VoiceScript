// Quick script to check if the notes table exists
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "voicescript_db"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  
  console.log("Connected to MySQL");
  
  // Check if notes table exists
  db.query("SHOW TABLES LIKE 'notes'", (err, result) => {
    if (err) {
      console.error("Error checking tables:", err);
      db.end();
      return;
    }
    
    if (result.length === 0) {
      console.log("\n❌ NOTES TABLE DOES NOT EXIST!");
      console.log("\nPlease run this SQL in phpMyAdmin or MySQL:");
      console.log(`
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);
      `);
    } else {
      console.log("✅ Notes table exists");
      
      // Check table structure
      db.query("DESCRIBE notes", (err, columns) => {
        if (err) {
          console.error("Error describing table:", err);
        } else {
          console.log("\nTable structure:");
          console.table(columns);
        }
        db.end();
      });
    }
  });
});

