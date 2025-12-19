import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_CONFIG from "../config/api";
import "./Register.css";

const logoImage = "/VoiceScript Logo1.png";

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
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      // If backend returns an error
      if (!response.ok) {
        setToast({ message: data.message, type: "error" });
        return;
      }

      setToast({ message: "Account created successfully! Please login.", type: "success" });

      // Clear fields
      setUsername("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error) {
      setToast({ message: "Error: Backend is not running or unreachable.", type: "error" });
    }
  };

  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "15px 25px",
            backgroundColor: toast.type === "success" ? "#28a745" : "#dc3545",
            color: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            animation: "slideInRight 0.3s ease",
            fontWeight: "500"
          }}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            style={{
              marginLeft: "15px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="top-logo">
        <img src={logoImage} alt="VoiceScript Logo" className="logo-img" />
      </div>

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
