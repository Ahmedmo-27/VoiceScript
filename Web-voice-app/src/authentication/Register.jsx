import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -------------------------
  //   HANDLE SIGNUP REQUEST
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      // If backend returns an error
      if (!response.ok) {
        alert(data.message);
        return;
      }

      alert("Account created successfully!");

      // Clear fields
      setUsername("");
      setEmail("");
      setPassword("");

    } catch (error) {
      alert("Error: Backend is not running or unreachable.");
    }
  };

  return (
    <div className="page-container">
      <div className="top-logo">LOGO</div>

      <div className="auth-card">
        <h1 className="auth-title">Register</h1>

        <form onSubmit={handleSubmit}>
          <label>User Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="•••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="auth-btn">
            Create Account
          </button>

          <Link to="/login" className="switch-text">
            Already have an account? Login
          </Link>
        </form>
      </div>
    </div>
  );
}
