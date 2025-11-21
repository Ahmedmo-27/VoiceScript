import React from "react";
import { Link } from "react-router-dom";

import "./AdminDashboard.css";
import { FiHome, FiUsers, FiFolder, FiChevronDown, FiSettings, FiPlus } from "react-icons/fi";

export default function AdminDashboard() {
  const users = [
    { name: "John Doe", date: "20/11/2025" },
    { name: "John Doe", date: "20/11/2025" },
    { name: "John Doe", date: "20/11/2025" },
    { name: "John Doe", date: "20/11/2025" },
  ];

  return (
    <div className="adm-container">

      {/* ---------- SIDEBAR ---------- */}
      <aside className="adm-sidebar">
        <h2 className="adm-logo">LOGO</h2>

        <div className="adm-nav">
          <a className="adm-link active"><FiHome /> Dashboard</a>
          <a className="adm-link"><FiUsers /> Users</a>

          <div className="adm-collection">
            <a className="adm-link">
              <FiFolder /> Collections <FiChevronDown className="chevron" />
            </a>
            <div className="adm-sub-links">
              <span>Note 2</span>
              <span>Note 3</span>
            </div>
          </div>

          <Link to="/" className="adm-link"><FiHome /> Home Page</Link>
         

        </div>

        <button className="adm-add-btn">
          <FiPlus />
        </button>
      </aside>

      {/* ---------- MAIN PANEL ---------- */}
      <main className="adm-main">

        {/* HEADER BAR */}
        <header className="adm-header">
          <h1>ADMIN PANEL</h1>
          <p className="adm-subtitle">Manage users, content, and controls</p>
        </header>

        {/* USERS SECTION */}
        <section className="adm-section">
          <h2 className="section-title">User Management</h2>

          <div className="user-list">
            {users.map((u, i) => (
              <div className="user-card" key={i}>
                <div className="user-info">
                  <div className="user-avatar"></div>
                  <h3>{u.name}</h3>
                </div>

                <span className="user-date">{u.date}</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
